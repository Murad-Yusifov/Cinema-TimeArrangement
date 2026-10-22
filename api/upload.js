
export default async function handler(req, res) {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return res.status(500).json({ error: "GITHUB_TOKEN is missing." });
  }

  const url =
    "https://api.github.com/repos/Murad-Yusifov/Cinema-TimeArrangement/contents/Schedule.xlsx";

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  try {
    // READ Schedule.xlsx
    if (req.method === "GET") {
      const response = await fetch(`${url}?ref=main`, { headers });

      if (!response.ok) {
        return res.status(502).json({
          error: "Could not read Schedule.xlsx from GitHub."
        });
      }

      const file = await response.json();
      const binary = Buffer.from(file.content, "base64");

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Cache-Control", "no-store");

      return res.status(200).send(binary);
    }

    // UPLOAD a replacement Schedule.xlsx
    if (req.method === "POST") {
      const uploadPassword = process.env.UPLOAD_PASSWORD;

      if (!uploadPassword) {
        return res.status(500).json({
          error: "UPLOAD_PASSWORD is missing."
        });
      }

      if (req.headers["x-upload-password"] !== uploadPassword) {
        return res.status(401).json({ error: "Incorrect upload password." });
      }

      const content = req.body?.content;

      if (
        typeof content !== "string" ||
        content.length === 0 ||
        content.length > 1_000_000 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(content)
      ) {
        return res.status(400).json({ error: "Invalid file content." });
      }

      const current = await fetch(`${url}?ref=main`, { headers });

      if (!current.ok) {
        return res.status(502).json({
          error: "Could not retrieve the current file."
        });
      }

      const existingFile = await current.json();

      const updated = await fetch(url, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: "Update cinema schedule",
          content,
          sha: existingFile.sha,
          branch: "main"
        })
      });

      const result = await updated.json();

      if (!updated.ok) {
        return res.status(502).json({
          error: result.message || "GitHub upload failed."
        });
      }

      return res.status(200).json({
        success: true,
        message: "Schedule.xlsx updated."
      });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    console.error("Schedule API error:", error);
    return res.status(500).json({ error: "Server error." });
  }
}
