// ============================================================
// CÔNG VIỆC — Edge Function: ai-gateway
// Nhiệm vụ: xác thực phiên → gọi Claude (tool use) → trả JSON
// AI chỉ SOẠN đề xuất; việc GHI dữ liệu do client gọi RPC sau
// khi người dùng bấm Xác nhận.
// Secrets cần đặt: ANTHROPIC_API_KEY
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// ---------- Bộ công cụ trợ lý ----------
const TOOLS = [
  {
    name: "cap_nhat_checkin",
    description:
      "Ghi nhận nơi làm việc HÔM NAY của người dùng. Dùng khi họ nói hôm nay làm ở đâu, nghỉ phép, đi công tác.",
    input_schema: {
      type: "object",
      properties: {
        loai: {
          type: "string",
          enum: ["VAN_PHONG", "LAM_O_NHA", "CONG_TAC", "NGHI_PHEP"],
          description: "Loại trạng thái làm việc",
        },
        dia_diem: { type: "string", description: "Bắt buộc nếu loai=CONG_TAC. Nơi công tác/địa điểm." },
        ghi_chu: { type: "string", description: "Ghi chú ngắn nếu có (vd lý do nghỉ phép)." },
      },
      required: ["loai"],
    },
  },
  {
    name: "them_di_chuyen",
    description:
      "Ghi nhận một lần DI CHUYỂN trong ngày (đi kho, đi cửa hàng, đi hỗ trợ...) sau khi đã có nơi làm việc chính.",
    input_schema: {
      type: "object",
      properties: {
        gio: { type: "string", description: "Giờ dự kiến, định dạng HH:MM, vd 14:00" },
        dia_diem: { type: "string" },
        ly_do: { type: "string" },
      },
      required: ["gio", "dia_diem"],
    },
  },
  {
    name: "tao_bao_cao",
    description:
      "Soạn BÁO CÁO CÔNG VIỆC trong ngày từ lời kể của người dùng. Chuẩn hóa câu chữ, giữ đúng 100% ý và dữ kiện gốc, không thêm bớt thông tin.",
    input_schema: {
      type: "object",
      properties: {
        noi_dung: {
          type: "string",
          description:
            "Báo cáo đã chuẩn hóa, đúng 3 mục với tiêu đề in đậm dạng markdown:\n**Công việc đã thực hiện:**\n- ...\n**Vấn đề phát sinh:**\n- ... (hoặc 'Không có')\n**Đề xuất / Đã xử lý:**\n- ... (hoặc 'Không có')",
        },
        co_van_de: {
          type: "boolean",
          description: "true nếu báo cáo có vấn đề phát sinh thực sự cần Ban Quản trị chú ý",
        },
      },
      required: ["noi_dung", "co_van_de"],
    },
  },
  {
    name: "tao_ke_hoach",
    description:
      "Tạo KẾ HOẠCH cho một việc sẽ làm trong tương lai mà người dùng nhắc tới (họp, đi kiểm tra, gặp đối tác...).",
    input_schema: {
      type: "object",
      properties: {
        tieu_de: { type: "string" },
        thoi_gian: {
          type: "string",
          description: "ISO 8601 kèm múi giờ +07:00, vd 2026-07-10T14:00:00+07:00. Suy ra từ lời nói và ngày hiện tại.",
        },
        dia_diem: { type: "string" },
        mo_ta: { type: "string" },
        nhac_truoc_phut: { type: "integer", description: "Mặc định 30" },
      },
      required: ["tieu_de", "thoi_gian"],
    },
  },
  {
    name: "tao_nhac_viec",
    description: "Tạo một lời NHẮC đơn lẻ theo yêu cầu trực tiếp (nhắc tôi gọi X, nhắc tôi gửi Y...).",
    input_schema: {
      type: "object",
      properties: {
        noi_dung: { type: "string" },
        lich_gui: { type: "string", description: "ISO 8601 +07:00" },
      },
      required: ["noi_dung", "lich_gui"],
    },
  },
  {
    name: "tra_loi",
    description: "Dùng khi người dùng chỉ hỏi/trò chuyện, không có dữ liệu cần ghi nhận.",
    input_schema: {
      type: "object",
      properties: { noi_dung: { type: "string", description: "Câu trả lời lịch sự, ngắn gọn" } },
      required: ["noi_dung"],
    },
  },
];

function systemPrompt(tenGoi: string, hoTen: string, mode: string, nowVN: string) {
  const base = `Em là trợ lý công việc riêng của ${tenGoi} (${hoTen}) trong hệ thống "Công việc" của công ty Nón Sơn.
Bây giờ là ${nowVN} (giờ Việt Nam).

QUY TẮC BẤT BIẾN:
1. Luôn xưng "em", gọi đúng "${tenGoi}". Giọng văn lịch sự, nhẹ nhàng, chuyên nghiệp như một thư ký tận tâm. Không dùng thuật ngữ kỹ thuật, không emoji.
2. Nghe lời kể tự nhiên (thường từ giọng nói, có thể rời rạc) → hiểu Ý ĐỊNH → gọi đúng công cụ với dữ liệu có cấu trúc.
3. TUYỆT ĐỐI giữ đúng ý và dữ kiện gốc. Không bịa thêm chi tiết, số liệu, tên người, địa điểm không được nhắc tới. Chỉ sắp xếp và chuẩn hóa câu chữ.
4. Một lời kể có thể chứa NHIỀU việc → gọi NHIỀU công cụ trong cùng một lượt (vd: vừa check-in, vừa có di chuyển buổi chiều, vừa có kế hoạch ngày mai).
5. Thiếu thông tin bắt buộc (vd công tác mà không rõ nơi) → vẫn gọi công cụ với phần đã có, để trống trường thiếu; giao diện sẽ hỏi lại.
6. Sau các tool, luôn kèm 1 câu text ngắn xác nhận nhẹ nhàng, vd: "Em đã sắp xếp lại như trên, ${tenGoi} xem giúp em ạ."`;

  const modes: Record<string, string> = {
    baocao: `\nNGỮ CẢNH: Người dùng đang ở màn hình BÁO CÁO NGÀY. Ưu tiên tao_bao_cao; đồng thời trích tao_ke_hoach / tao_nhac_viec nếu lời kể có nhắc việc tương lai hoặc hạn chót.`,
    checkin: `\nNGỮ CẢNH: Người dùng đang ở màn hình CHECK-IN. Ưu tiên cap_nhat_checkin và them_di_chuyen.`,
    troly: `\nNGỮ CẢNH: Người dùng nói với trợ lý từ màn hình chính, có thể là bất kỳ ý định nào.`,
  };
  return base + (modes[mode] ?? modes.troly);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "METHOD" }, 405);

  try {
    const { token, mode = "troly", text } = await req.json();
    if (!token || !text?.trim()) return json({ error: "THIEU_DU_LIEU" }, 400);

    // ---- Xác thực phiên bằng service role ----
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: phien } = await sb
      .from("phien_dang_nhap")
      .select("ma_nv, het_han, nguoi_dung(ho_ten, ten_goi, trang_thai)")
      .eq("token", token)
      .single();
    const nd: any = phien?.nguoi_dung;
    if (!phien || new Date(phien.het_han) < new Date() || nd?.trang_thai !== "HOAT_DONG") {
      return json({ error: "PHIEN_HET_HAN" }, 401);
    }

    // ---- Model từ app_settings ----
    const { data: cfg } = await sb
      .from("app_settings").select("gia_tri").eq("khoa", "model_troly").single();
    const model = cfg?.gia_tri || "claude-haiku-4-5";

    const nowVN = new Date().toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      weekday: "long", year: "numeric", month: "2-digit",
      day: "2-digit", hour: "2-digit", minute: "2-digit",
    });

    // ---- Gọi Claude ----
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system: systemPrompt(nd.ten_goi, nd.ho_ten, mode, nowVN),
        tools: TOOLS,
        messages: [{ role: "user", content: text.trim() }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic:", err);
      return json({ error: "AI_LOI" }, 502);
    }
    const data = await res.json();

    const tool_calls = (data.content || [])
      .filter((b: any) => b.type === "tool_use")
      .map((b: any) => ({ name: b.name, input: b.input }));
    const reply = (data.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text).join("\n").trim();

    // ---- Nhật ký kiểm toán + chi phí ----
    const { data: luot } = await sb.from("tro_ly_luot").insert({
      ma_nv: phien.ma_nv,
      che_do: mode,
      noi_dung_nguoi_dung: text.trim(),
      cong_cu_goi: tool_calls,
      van_ban_tra_loi: reply,
      model,
      token_vao: data.usage?.input_tokens ?? 0,
      token_ra: data.usage?.output_tokens ?? 0,
    }).select("id").single();

    return json({ luot_id: luot?.id ?? null, text: reply, tool_calls });
  } catch (e) {
    console.error(e);
    return json({ error: "SERVER_LOI" }, 500);
  }
});
