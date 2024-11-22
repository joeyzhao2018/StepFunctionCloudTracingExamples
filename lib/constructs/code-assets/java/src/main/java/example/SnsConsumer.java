package example;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.SNSEvent;
public class SnsConsumer implements RequestHandler<SNSEvent, Void> {
    @Override
    public Void handleRequest(SNSEvent event, Context context) {
        event.getRecords().forEach(record -> {
            SNSEvent.SNS sns = record.getSNS();
            context.getLogger().log("SNS message ID: " + sns.getMessageId());
            context.getLogger().log("SNS message: " + sns.getMessage());
        });
        // You can add more logic here to process the message as needed
        return null;
    }
}