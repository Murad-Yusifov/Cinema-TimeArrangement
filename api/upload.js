
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const token = process.env.GITHUB_TOKEN;
  const uploadPassword = process.env.UPLOAD_PASSWORD;

  if (!token || !uploadPassword) {
    return res.status(500).json({
      error: "Missing GITHUB_TOKEN or UPLOAD_PASSWORD"
    });
  }

  if (req.headers["x-upload-password"] !== uploadPassword) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { content } = req.body || {};

  if (
    typeof content !== "string" ||
    content.length === 0 ||
    content.length > 1_000_000
  ) {
    return res.status(400).json({ error: "Invalid file content" });
  }

  const url =
    "https://api.github.com/repos/Murad-Yusifov/Cinema-TimeArrangement/contents/Schedule.xlsx";

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  try {
    // Get current file SHA
    const current = await fetch(url, { headers });

    if (!current.ok) {
      return res.status(502).json({
        error: "Could not read Schedule.xlsx from GitHub"
      });
    }

    const { sha } = await current.json();

    // Replace the existing Excel file
    const updated = await fetch(url, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Update cinema schedule",
        content,
        sha,
        branch: "main"
      })
    });

    const result = await updated.json();

    if (!updated.ok) {
      return res.status(502).json({
        error: result.message || "GitHub upload failed"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Schedule.xlsx updated"
    });
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
}
