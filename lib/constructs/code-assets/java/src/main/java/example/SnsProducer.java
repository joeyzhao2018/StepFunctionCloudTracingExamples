package example;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.sns.AmazonSNS;
import com.amazonaws.services.sns.AmazonSNSClientBuilder;
import com.amazonaws.services.sns.model.PublishRequest;
import com.amazonaws.services.sns.model.PublishResult;
public class SnsProducer implements RequestHandler<Object, String>  {
    private static final AmazonSNS client = AmazonSNSClientBuilder.defaultClient();
    private static final String[] topicArns = System.getenv("SNS_TOPIC_ARNS").split(",");

    private static final String ownFunctionName = System.getenv("AWS_LAMBDA_FUNCTION_NAME");

    @Override
    public String handleRequest(Object input, Context context) {
        StringBuilder sb = new StringBuilder();
        for (String topicArn : topicArns ) {
            sb.append(topicArn);
            sb.append(":");
            try{
                PublishRequest publishRequest = new PublishRequest(topicArn, "hello from "+ ownFunctionName);
                PublishResult response = client.publish(publishRequest);
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