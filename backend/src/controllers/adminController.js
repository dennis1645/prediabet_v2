import bcrypt from "bcryptjs";
import db from "../database/connection.js";

/**
 * Daftar seluruh pengguna beserta ringkasan profil klinis dan jumlah percakapan.
 */
export function listUsers(req, res) {
  try {
    const users = db
      .prepare(`
        SELECT
          u.id,
          u.username,
          u.email,
          u.phone_number,
          u.role,
          u.created_at,
          u.updated_at,
          CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END AS has_profile,
          p.full_profile_data,
          p.analysis_result,
          (SELECT COUNT(*) FROM chat_sessions cs WHERE cs.user_id = u.id) AS total_sessions,
          (SELECT COUNT(*) FROM chat_logs cl WHERE cl.user_id = u.id) AS total_messages
        FROM users u
        LEFT JOIN profiles p ON p.user_id = u.id
        ORDER BY u.id DESC
      `)
      .all();

    const formatted = users.map((u) => {
      let profileSummary = null;
      let analysisSummary = null;
      try {
        if (u.full_profile_data) {
          const p = JSON.parse(u.full_profile_data);
          profileSummary = {
            nama: p.nama || u.username,
            usia: p.usia,
            jenis_kelamin: p.jenis_kelamin,
            pantangan_alergi: p.pantangan_alergi || [],
            komorbiditas: p.komorbiditas || [],
          };
        }
        if (u.analysis_result) {
          const a = JSON.parse(u.analysis_result);
          analysisSummary = {
            kategori_risiko: a.kategori_risiko,
            bmi: a.bmi,
            target_kalori: a.target_kalori,
            active_diet_label: a.active_diet_label || "Belum Dipilih (Pola Seimbang 3J)",
          };
        }
      } catch (e) {
        // ignore JSON parse issues on malformed legacy rows
      }

      return {
        id: u.id,
        username: u.username,
        email: u.email,
        phone_number: u.phone_number,
        role: u.role || "user",
        created_at: u.created_at,
        updated_at: u.updated_at,
        has_profile: Boolean(u.has_profile),
        total_sessions: u.total_sessions || 0,
        total_messages: u.total_messages || 0,
        profile: profileSummary,
        analysis: analysisSummary,
      };
    });

    const stats = {
      total_users: formatted.length,
      total_admins: formatted.filter((u) => u.role === "admin").length,
      users_with_profile: formatted.filter((u) => u.has_profile).length,
      total_messages: formatted.reduce((acc, u) => acc + u.total_messages, 0),
    };

    res.json({ success: true, data: { users: formatted, stats } });
  } catch (error) {
    console.error("Admin listUsers error:", error);
    res.status(500).json({ success: false, message: "Gagal memuat daftar pengguna." });
  }
}

/**
 * Ubah role pengguna (user <-> admin).
 */
export function updateUserRole(req, res) {
  try {
    const targetId = parseInt(req.params.id, 10);
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Role tidak valid (harus 'user' atau 'admin')." });
    }
    if (targetId === req.user.id && role !== "admin") {
      return res.status(400).json({ success: false, message: "Admin tidak dapat menurunkan role akunnya sendiri." });
    }

    const now = new Date().toISOString();
    const info = db.prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?").run(role, now, targetId);
    if (info.changes === 0) {
      return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });
    }

    res.json({ success: true, message: `Role pengguna berhasil diubah menjadi '${role}'.` });
  } catch (error) {
    console.error("Admin updateUserRole error:", error);
    res.status(500).json({ success: false, message: "Gagal mengubah role pengguna." });
  }
}

/**
 * Reset password pengguna oleh admin.
 */
export function resetUserPassword(req, res) {
  try {
    const targetId = parseInt(req.params.id, 10);
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password baru minimal 6 karakter." });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPassword, salt);
    const now = new Date().toISOString();

    const info = db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(hash, now, targetId);
    if (info.changes === 0) {
      return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });
    }

    res.json({ success: true, message: "Password pengguna berhasil direset." });
  } catch (error) {
    console.error("Admin resetUserPassword error:", error);
    res.status(500).json({ success: false, message: "Gagal mereset password pengguna." });
  }
}

/**
 * Hapus akun pengguna beserta seluruh datanya (cascade).
 */
export function deleteUser(req, res) {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (targetId === req.user.id) {
      return res.status(400).json({ success: false, message: "Admin tidak dapat menghapus akunnya sendiri." });
    }

    const info = db.prepare("DELETE FROM users WHERE id = ?").run(targetId);
    if (info.changes === 0) {
      return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });
    }

    res.json({ success: true, message: "Pengguna berhasil dihapus dari sistem." });
  } catch (error) {
    console.error("Admin deleteUser error:", error);
    res.status(500).json({ success: false, message: "Gagal menghapus pengguna." });
  }
}

/**
 * Pratinjau riwayat percakapan untuk satu user.
 */
export function getUserChats(req, res) {
  try {
    const targetId = parseInt(req.params.id, 10);
    const userRow = db.prepare("SELECT id, username, email FROM users WHERE id = ?").get(targetId);
    if (!userRow) {
      return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });
    }

    const logs = db
      .prepare(`
        SELECT cl.id, cl.session_id, cs.title AS session_title, cl.role, cl.content, cl.metadata, cl.created_at
        FROM chat_logs cl
        LEFT JOIN chat_sessions cs ON cs.id = cl.session_id
        WHERE cl.user_id = ?
        ORDER BY cl.id ASC
      `)
      .all(targetId);

    res.json({ success: true, data: { user: userRow, logs } });
  } catch (error) {
    console.error("Admin getUserChats error:", error);
    res.status(500).json({ success: false, message: "Gagal memuat riwayat percakapan pengguna." });
  }
}

function escapeCsvCell(val) {
  if (val === null || val === undefined) return "";
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Download percakapan (1 user atau semua user) dalam format CSV atau JSON untuk bahan evaluasi.
 */
export function exportChats(req, res) {
  try {
    const format = (req.query.format || "csv").toLowerCase();
    const userIdParam = req.query.userId ? parseInt(req.query.userId, 10) : null;

    const query = `
      SELECT
        cl.id AS message_id,
        u.id AS user_id,
        u.username,
        u.email,
        cl.session_id,
        cs.title AS session_title,
        cl.role,
        cl.content,
        cl.metadata,
        cl.created_at
      FROM chat_logs cl
      JOIN users u ON u.id = cl.user_id
      LEFT JOIN chat_sessions cs ON cs.id = cl.session_id
      ${userIdParam ? "WHERE cl.user_id = ?" : ""}
      ORDER BY u.id ASC, cl.id ASC
    `;

    const rows = userIdParam ? db.prepare(query).all(userIdParam) : db.prepare(query).all();

    const dateStamp = new Date().toISOString().split("T")[0];
    const scopeName = userIdParam ? `user_${userIdParam}` : "all_users";

    if (format === "json") {
      const parsedRows = rows.map((r) => {
        let metaParsed = null;
        try {
          metaParsed = r.metadata ? JSON.parse(r.metadata) : null;
        } catch (e) {
          metaParsed = r.metadata;
        }
        return { ...r, metadata: metaParsed };
      });
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="prediabeat_chats_${scopeName}_${dateStamp}.json"`);
      return res.send(JSON.stringify({ exported_at: new Date().toISOString(), total_messages: parsedRows.length, records: parsedRows }, null, 2));
    }

    // Default CSV (dengan UTF-8 BOM agar rapi dibuka langsung di Microsoft Excel)
    const headers = [
      "message_id",
      "user_id",
      "username",
      "email",
      "session_id",
      "session_title",
      "role",
      "content",
      "guardrail",
      "latency_ms",
      "tokens_per_sec",
      "vllm_connected",
      "source",
      "created_at",
    ];

    const csvLines = [headers.join(",")];
    for (const r of rows) {
      let meta = {};
      try {
        meta = r.metadata ? JSON.parse(r.metadata) : {};
      } catch (e) {
        meta = {};
      }
      csvLines.push(
        [
          escapeCsvCell(r.message_id),
          escapeCsvCell(r.user_id),
          escapeCsvCell(r.username),
          escapeCsvCell(r.email),
          escapeCsvCell(r.session_id || ""),
          escapeCsvCell(r.session_title || ""),
          escapeCsvCell(r.role),
          escapeCsvCell(r.content),
          escapeCsvCell(meta.guardrail || ""),
          escapeCsvCell(meta.latency_ms ?? ""),
          escapeCsvCell(meta.tokens_per_second ?? ""),
          escapeCsvCell(meta.vllm_connected ?? ""),
          escapeCsvCell(meta.source || ""),
          escapeCsvCell(r.created_at),
        ].join(",")
      );
    }

    const csvContent = "\uFEFF" + csvLines.join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="prediabeat_chats_${scopeName}_${dateStamp}.csv"`);
    return res.send(csvContent);
  } catch (error) {
    console.error("Admin exportChats error:", error);
    res.status(500).json({ success: false, message: "Gagal mengekspor percakapan." });
  }
}
