exports.handler = async (event) => {
  console.log("Processing item:", JSON.stringify(event));
  // Add your processing logic here
  throw new Error("failing on purpose");

  //   return {
  //     ...event,
  //     processedAt: new Date().toISOString(),
  //   };
};
