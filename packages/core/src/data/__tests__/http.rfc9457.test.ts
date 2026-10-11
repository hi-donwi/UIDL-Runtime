import { describe, expect, it } from "vitest";
import { createHttpAdapter } from "../adapters/http";
import { DataError } from "../errors";

describe("HttpAdapter RFC 9457 Problem Details Support", () => {
  it("extracts invalidParams into DataError.fields when backend returns RFC 9457", async () => {
    const rfc9457Response = {
      type: "about:blank",
      title: "Validation Failed",
      status: 422,
      detail: "The payload failed validation checks",
      code: "VALIDATION_FAILED",
      invalidParams: [
        { name: "title", reason: "Title is required" },
        { name: "dueDate", reason: "Due date cannot be in the past" },
      ],
    };

    const mockFetch = async () => {
      return new Response(JSON.stringify(rfc9457Response), {
        status: 422,
        headers: { "Content-Type": "application/problem+json" },
      });
    };

    const adapter = createHttpAdapter({
      baseUrl: "http://api.example.com",
      fetchImpl: mockFetch as any,
    });

    try {
      await adapter.create({
        collection: "Task",
        data: {},
      });
      expect.unreachable("should have thrown DataError");
    } catch (err: any) {
      expect(err).toBeInstanceOf(DataError);
      expect(err.code).toBe("validation");
      expect(err.message).toBe("The payload failed validation checks");
      expect(err.fields).toEqual({
        title: "Title is required",
        dueDate: "Due date cannot be in the past",
      });
    }
  });

  it("falls back to title if detail is absent in RFC 9457 response", async () => {
    const mockFetch = async () => {
      return new Response(
        JSON.stringify({
          title: "Forbidden Operation",
          status: 403,
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/problem+json" },
        },
      );
    };

    const adapter = createHttpAdapter({
      baseUrl: "http://api.example.com",
      fetchImpl: mockFetch as any,
    });

    try {
      await adapter.remove("Task", "123");
      expect.unreachable("should have thrown DataError");
    } catch (err: any) {
      expect(err).toBeInstanceOf(DataError);
      expect(err.code).toBe("forbidden");
      expect(err.message).toBe("Forbidden Operation");
    }
  });
});
