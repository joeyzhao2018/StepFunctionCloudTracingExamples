exports.handler = async (event) => {
  console.log("Processing item:", JSON.stringify(event));
  // Add your processing logic here
  return {
    errorHandled: true,
    error: event
  };

  //   return {
  //     ...event,
  //     processedAt: new Date().toISOString(),
  //   };
};
