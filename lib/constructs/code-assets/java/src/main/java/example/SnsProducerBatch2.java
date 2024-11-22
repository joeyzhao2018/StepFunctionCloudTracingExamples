package example;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.model.PublishBatchRequest;
import software.amazon.awssdk.services.sns.model.PublishBatchRequestEntry;
import software.amazon.awssdk.services.sns.model.PublishBatchResponse;

import java.util.ArrayList;

import java.util.List;


public class SnsProducerBatch2 implements RequestHandler<Object, String> {
    private static final SnsClient snsClient = SnsClient.builder().build();
    private static final String[] topicArns = System.getenv("SNS_TOPIC_ARNS").split(",");
    private static final String ownFunctionName = System.getenv("AWS_LAMBDA_FUNCTION_NAME");

    private static final int numberOfMessages = Integer.parseInt(System.getenv("NUMBER_OF_MESSAGES"));
    private static final String message = "hello from "+ ownFunctionName;

    @Override
    public String handleRequest(Object input, Context context) {
        StringBuilder sb = new StringBuilder();
        for (String topicArn : topicArns ) {
            sb.append(topicArn);
            sb.append(":");
            try {
                // Single message publishing example
                final PublishBatchRequest.Builder requestBatch = PublishBatchRequest.builder().topicArn(topicArn);
                final List<PublishBatchRequestEntry> batchRequestEntries = new ArrayList<>();
                for (int i=0; i< numberOfMessages; i++) {
                    final PublishBatchRequestEntry.Builder entry = PublishBatchRequestEntry.builder().id(Integer.toString(i)).message(message+i);
                    batchRequestEntries.add(entry.build());
                }
                requestBatch.publishBatchRequestEntries(batchRequestEntries);
                ;

                PublishBatchResponse response = snsClient.publishBatch(requestBatch.build());
                sb.append(response.toString());

            } catch (Exception e) {
                e.printStackTrace();
                sb.append("Error:" + e.getMessage());
            }
            sb.append(";");
        }
        return sb.toString();
    }
}