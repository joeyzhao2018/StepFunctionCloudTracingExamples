package example;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.SQSEvent;
import com.timgroup.statsd.NonBlockingStatsDClientBuilder;
import com.timgroup.statsd.StatsDClient;

public class Consumer implements RequestHandler<SQSEvent, Void>{

  private static final StatsDClient statsd = new NonBlockingStatsDClientBuilder().hostname("localhost").build();

  @Override
  public Void handleRequest(SQSEvent event, Context context)
  {
    for (SQSEvent.SQSMessage message : event.getRecords()) {
      String payload = message.getBody();
      System.out.println("received sqs message " + payload);
    }
    return null;
  }
}
