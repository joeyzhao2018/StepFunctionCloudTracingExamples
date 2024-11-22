package example;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.kinesis.AmazonKinesis;
import com.amazonaws.services.kinesis.AmazonKinesisClientBuilder;
import com.amazonaws.services.kinesis.model.PutRecordRequest;
import com.amazonaws.services.kinesis.model.PutRecordResult;
import java.nio.ByteBuffer;
public class KinesisProducer implements RequestHandler<Object, String> {
    private static final String[] streams = System.getenv("KINESIS_STREAMS").split(",");
    private static final String ownFunctionName = System.getenv("AWS_LAMBDA_FUNCTION_NAME");
    private static final String partitionKey = "java-producer";
    private static final AmazonKinesis kinesisClient = AmazonKinesisClientBuilder.standard().build();
    @Override
    public String handleRequest(Object input, Context context) {
        StringBuilder sb = new StringBuilder();
        for (String streamName : streams) {
            System.out.println("sending to " + streamName);
            sb.append(streamName);
            sb.append(":");
            try {
                String data = "Hello from" + ownFunctionName; // The data you want to send
                ByteBuffer dataBuffer = ByteBuffer.wrap(data.getBytes());
                PutRecordRequest putRecordRequest = new PutRecordRequest()
                        .withStreamName(streamName)
                        .withPartitionKey(partitionKey)
                        .withData(dataBuffer);
                PutRecordResult putRecordResult = kinesisClient.putRecord(putRecordRequest);
                sb.append(putRecordResult.getSequenceNumber());
            } catch (Exception e) {
                e.printStackTrace();
                sb.append("Error:" + e.getMessage());
            }
            sb.append(";");
        }
        return sb.toString();
    }
}