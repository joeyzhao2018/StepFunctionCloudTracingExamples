exports.resthandler = async (event, context) => {
  console.log("[REST] Received event:", JSON.stringify(event, null, 2));
  console.log("[REST] Received context:", JSON.stringify(context, null, 2));
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello from REST API Lambda!",
      event: event,
    }),
  };
};

exports.httphandler = async (event, context) => {
  console.log("[HTTP] Received event:", JSON.stringify(event, null, 2));
  console.log("[HTTP] Received context:", JSON.stringify(context, null, 2));
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello from HTTP API Lambda!",
      event: event,
    }),
  };
};
