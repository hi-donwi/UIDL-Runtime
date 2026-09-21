package dev.uidl.generator.json;

import java.io.IOException;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.module.SimpleModule;

import dev.uidl.generator.compiler.ListCompiler;

/**
 * Jackson module that serializes {@link ListCompiler.JSONNull#INSTANCE} as JSON {@code null}.
 * Register this module on the ObjectMapper used for UIDL output.
 */
public final class UidlModule extends SimpleModule {

    public UidlModule() {
        super("UidlModule");
        addSerializer(ListCompiler.JSONNull.class, new JsonSerializer<>() {
            @Override
            public void serialize(ListCompiler.JSONNull value, JsonGenerator gen, SerializerProvider serializers)
                    throws IOException {
                gen.writeNull();
            }
        });
    }
}
