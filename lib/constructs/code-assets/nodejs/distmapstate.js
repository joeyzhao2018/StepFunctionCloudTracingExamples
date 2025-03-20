const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");

const s3Client = new S3Client({});

const bucketName = process.env.BUCKET_NAME;

exports.handler = async (event) => {
  console.log("Processing item:", JSON.stringify(event));
  var fileKey = `count_${event.runid}.txt`;
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
  });
  const { Body } = await s3Client.send(getCommand);
  const data = await streamToString(Body);

  // Convert the ReadableStream to string

  // const data = await s3
  //   .getObject({
  //     Bucket: bucketName,
  //     Key: fileKey,
  //   })
  //   .promise();

  var currentCount = parseInt(data);
  var newCount = currentCount + 1;
  var target = parseInt(event.data);
  // Add your processing logic here
  if (target !== currentCount) {
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: newCount.toString(),
      ContentType: "text/plain",
    });
    await s3Client.send(putCommand);
    // await s3
    //   .putObject({
    //     Bucket: bucketName,
    //     Key: fileKey,
    //     Body: newCount.toString(),
    //     ContentType: "text/plain",
    //   })
    //   .promise();

    throw new Error(
      `[RUNID: ${event.runid}] current count: ${currentCount} !=  target ${target}`
    );
  }
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Successfully matched",
      target: target,
    }),
  };
};

async function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
  });
}
