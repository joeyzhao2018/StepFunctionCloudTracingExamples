package example;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPResponse;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

import org.json.JSONObject;


public class Producer2 implements RequestHandler<APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse>{

    private static final SqsClient sqsClient = SqsClient.builder().build();
    private static final String[] queueUrls = System.getenv("SQS_QUEUE_URLS").split(",");

    @Override
    public APIGatewayV2HTTPResponse handleRequest(APIGatewayV2HTTPEvent event, Context context)
    {
        final String msg = new JSONObject()
                .put("hello", "world")
                .toString();

        for (String url : queueUrls) {
            System.out.println("sending sqs message " + msg + " to " + url);
            sqsClient.sendMessage(SendMessageRequest.builder()
                    .queueUrl(url)
                    .messageBody(msg)
                    .build());
        }

        APIGatewayV2HTTPResponse response = new APIGatewayV2HTTPResponse();
        response.setStatusCode(200);
        response.setBody("ok");
        return response;
    }
}