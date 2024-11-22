package example;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.sns.AmazonSNS;
import com.amazonaws.services.sns.AmazonSNSClientBuilder;
import com.amazonaws.services.sns.model.PublishBatchRequest;
import com.amazonaws.services.sns.model.PublishBatchRequestEntry;
import com.amazonaws.services.sns.model.PublishBatchResult;

import java.util.ArrayList;
import java.util.List;


public class SnsProducerBatch implements RequestHandler<Object, String>  {
    private static final AmazonSNS client = AmazonSNSClientBuilder.defaultClient();
    private static final String[] topicArns = System.getenv("SNS_TOPIC_ARNS").split(",");

    private static final String ownFunctionName = System.getenv("AWS_LAMBDA_FUNCTION_NAME");
    private static final String message = "hello from "+ ownFunctionName;

    private static final int numberOfMessages = Integer.parseInt(System.getenv("NUMBER_OF_MESSAGES"));
    @Override

    public String handleRequest(Object input, Context context) {
        StringBuilder sb = new StringBuilder();
        for (String topicArn : topicArns ) {
            sb.append(topicArn);
            sb.append(":");
            try {
                final List<PublishBatchRequestEntry> batchRequestEntries = new ArrayList<>();
                for (int i=0; i< numberOfMessages; i++) {
                    batchRequestEntries.add(new PublishBatchRequestEntry()
                            .withId(Integer.toString(i))
                            .withMessage(message+i));
                }

                PublishBatchResult response = client.publishBatch(new PublishBatchRequest()
                        .withTopicArn(topicArn)
                        .withPublishBatchRequestEntries(
                            batchRequestEntries
                        ));
                sb.append(response.toString());
            }
            catch (Exception e) {
                e.printStackTrace();
                sb.append("Error:" + e.getMessage());
            }
            sb.append(";");
        }


        return sb.toString();
    }
}