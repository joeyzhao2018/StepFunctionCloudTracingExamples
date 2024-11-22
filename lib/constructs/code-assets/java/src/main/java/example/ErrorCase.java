package example;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;

public class ErrorCase implements RequestHandler<Object, Object> {
    @Override
    public Object handleRequest(Object input, Context context) {
        throw new RuntimeException("This is a deliberately thrown error!");
    }
}

