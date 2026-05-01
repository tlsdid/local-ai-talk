import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "30mb" }));

function joinUrl(baseURL, path) {
  return `${String(baseURL).replace(/\/+$/, "")}/${String(path).replace(/^\/+/, "")}`;
}

app.post("/api/chat", async (req, res) => {
  try {
    const {
      baseURL,
      apiKey,
      model,
      messages,
      temperature,
      max_tokens,
    } = req.body || {};

    if (!baseURL || !apiKey || !model || !Array.isArray(messages)) {
      return res.status(400).json({
        error: "缺少 baseURL、apiKey、model 或 messages",
      });
    }

    const upstream = await fetch(joinUrl(baseURL, "/chat/completions"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 1024,
        stream: false,
      }),
    });

    const text = await upstream.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error:
          data?.error?.message ||
          data?.message ||
          text ||
          upstream.statusText ||
          "上游接口请求失败",
      });
    }

    return res.json({
      content: data?.choices?.[0]?.message?.content || "",
      raw: data,
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "后端代理请求失败",
    });
  }
});

app.listen(3001, () => {
  console.log("API proxy running at http://localhost:3001");
});
