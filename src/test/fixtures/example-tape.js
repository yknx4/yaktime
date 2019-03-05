var path = require("path");

/**
 * GET /api/json?cmd=GetBackLinkData&item=https://altenwerth.name&Count=50000&MaxSourceURLsPerRefDomain=1&Mode=1&app_api_key=16650782E7994E4B5F5A2014E39F9B68&datasource=fresh
 *
 * user-agent: Elixir
 * content-length: 0
 * host: enterprise.majestic.com
 * accept-encoding: gzip, deflate
 * accept: application/json
 * connection: close
 */

module.exports = function (req, res) {
  res.statusCode = 200;

  res.setHeader("date", "Fri, 22 Feb 2019 23:17:43 GMT");
  res.setHeader("server", "Apache");
  res.setHeader("content-type", "application/json;charset=UTF-8");
  res.setHeader("content-encoding", "gzip");
  res.setHeader("connection", "close");
  res.setHeader("transfer-encoding", "chunked");

  res.setHeader("x-yakbak-tape", path.basename(__filename, ".js"));

  res.write(Buffer.from("H4sIAAAAAAAAAISRX2+CMBTFv4rpM2JbHFHedGh088+iuGRZ9tBBp43QulKci+G7r62gZC8mPPT+eu45t5czeBQJBQFYPgMHjKQUck7znGwN02RcpKmll3LKE3oaFixNQqKMBEPUb0PcxrgFvaDrB7hfy6Lfg1YgB6ypPFJpuxodCLVQN9Cf1wO1ZkEyY/o0eHtZbhbhlb9SmTPB9RVyoev3e8jFD75nojacfRfUBk7Dyh5ijKHX9XG/PV6N1hMt0+OSiHymNAfBGQxJvJ8xvrfFhJJE+5vj4EhYalT60iihc5VOFc20/U6pQx50OiRVlP9QqXYuN0PfhJdnNyIcveKCK+s2liKzh7t2RlBZbVYzDebktKJfocgI45E4sFjPh6Dla1HImNbQsywicktVU7iUbHs39l9ENblpb4ZUWCc1Y2qxpkKRtLFkWKHbWm05JyreWVBe/hAI3j/KsvwDAAD//w==", "base64"));
  res.write(Buffer.from("AwAUtetdlQIAAA==", "base64"));
  res.end();

  return __filename;
};
