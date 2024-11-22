exports.handler = async (event) => {
  console.log("Processing item:", JSON.stringify(event));
  // Add your processing logic here
  if (event.data === "fail") {
    throw new Error("Failed to process item");
  }
  return {
    ...event,
    processedAt: new Date().toISOString(),
  };
};
