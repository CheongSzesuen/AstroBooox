export const config = {
  runtime: "edge", // 声明使用 Edge Function
};

export default async function handler(request: Request) {  // 使用标准 Request 类型
  // 目标网站（替换成你的 Cloudflare Pages 地址）
  const targetUrl = "https://astrobooox.pages.dev" + new URL(request.url).pathname;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        // 可选：传递原始请求头
        "User-Agent": request.headers.get("User-Agent") || "",
      },
    });

    // 返回代理的响应
    return new Response(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "text/html",
        "Cache-Control": "public, max-age=3600", // 可选：缓存1小时
      },
    });
  } catch (error) {
    return new Response("Proxy failed", { status: 500 });
  }
}