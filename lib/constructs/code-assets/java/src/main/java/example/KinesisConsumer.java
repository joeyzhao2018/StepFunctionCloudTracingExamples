package example;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.KinesisEvent;
public class KinesisConsumer implements RequestHandler<KinesisEvent, Void> {
    @Override
    public Void handleRequest(KinesisEvent event, Context context) {
        for (KinesisEvent.KinesisEventRecord record : event.getRecords()) {
            String payload = new String(record.getKinesis().getData().array());
            System.out.println("Record: " + payload);
        }
        return null;
    }
}