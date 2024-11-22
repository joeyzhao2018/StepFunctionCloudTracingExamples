package example;

import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.model.PublishRequest;
import software.amazon.awssdk.services.sns.model.PublishResponse;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.Context;


public class SnsProducer2 implements RequestHandler<Object, String> {
    private static final SnsClient snsClient = SnsClient.builder().build();
    private static final String[] topicArns = System.getenv("SNS_TOPIC_ARNS").split(",");
    private static final String ownFunctionName = System.getenv("AWS_LAMBDA_FUNCTION_NAME");
    @Override
    public String handleRequest(Object input, Context context) {
        StringBuilder sb = new StringBuilder();
        for (String topicArn : topicArns ) {
            sb.append(topicArn);
            sb.append(":");
            try {
                // Single message publishing example
                String message = "hello from "+ ownFunctionName;
                PublishRequest publishRequest = PublishRequest.builder().topicArn(topicArn).message(message).build();
                PublishResponse response = snsClient.publish(publishRequest);
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