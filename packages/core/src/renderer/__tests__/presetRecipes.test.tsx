import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { UIDocumentRenderer } from "../UIDocumentRenderer";
import { defaultRegistry } from "../../registry/registry";
import { compileAuthPage } from "../../compiler/auth";
import { compileLandingPage } from "../../compiler/landing";
import { createDocumentState } from "../../state/createDocumentState";
import type { CommandRequest } from "../../types/actions";

/** A host always gives the renderer a state store; the recipe's state seeds it. */
const storeFor = (doc: ReturnType<typeof page>) => createDocumentState(doc.state ?? {}).getState();

const page = () =>
  compileAuthPage(
    { name: "sign-in", mode: "sign-in", command: "auth.signIn", successRoute: "/home" },
    { hostCapabilities: { collections: [], commands: ["auth.signIn"] }, uiPolicy: { lang: "en" } },
  );

describe("TextField obscureText", () => {
  it("is a declared prop, so editors and other runtimes can see it", () => {
    const names = defaultRegistry.get("TextField")?.propDescriptors?.map((p) => p.name);
    expect(names).toContain("obscureText");
  });

  it("masks the input and does not leak the prop onto the element", () => {
    const doc = page();
    render(<UIDocumentRenderer document={doc} stateStore={storeFor(doc)} />);
    const password = screen.getByLabelText("Password *") as HTMLInputElement;
    const email = screen.getByLabelText("Email *") as HTMLInputElement;
    expect(password.type).toBe("password");
    expect(email.type).toBe("text");
    expect(password.getAttribute("obscuretext")).toBeNull();
  });
});

describe("the sign-in recipe, rendered", () => {
  it("sends what was typed to the host, clears the password, and navigates on success", async () => {
    const requests: CommandRequest[] = [];
    const routes: unknown[] = [];
    const doc = page();
    render(
      <UIDocumentRenderer
        document={doc}
        stateStore={storeFor(doc)}
        commandHandler={(request) => {
          requests.push(request);
          return { ok: true };
        }}
        onRouteChange={(route) => routes.push(route)}
      />,
    );

    fireEvent.change(screen.getByLabelText("Email *"), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText("Password *"), { target: { value: "s3cret" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(routes).toEqual(["/home"]));
    expect(requests).toEqual([{ name: "auth.signIn", payload: { email: "ana@example.com", password: "s3cret" } }]);
    expect((screen.getByLabelText("Password *") as HTMLInputElement).value).toBe("");
  });

  it("shows the host's error and clears the password when the command fails", async () => {
    const doc = page();
    render(
      <UIDocumentRenderer
        document={doc}
        stateStore={storeFor(doc)}
        commandHandler={() => {
          throw new Error("Invalid email or password");
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Email *"), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText("Password *"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findAllByText("Invalid email or password")).not.toHaveLength(0);
    expect((screen.getByLabelText("Password *") as HTMLInputElement).value).toBe("");
  });
});

describe("the landing recipe's signup section, rendered", () => {
  it("sends the typed email to the host and thanks the visitor", async () => {
    const doc = compileLandingPage(
      {
        name: "home",
        brand: { name: "Atlas" },
        sections: [{ kind: "signup", id: "news", title: { id: "Kabar", en: "News" }, command: "newsletter.subscribe" }],
      },
      { hostCapabilities: { collections: [], commands: ["newsletter.subscribe"] }, uiPolicy: { lang: "en" } },
    );
    const requests: CommandRequest[] = [];
    render(
      <UIDocumentRenderer
        document={doc}
        stateStore={createDocumentState(doc.state ?? {}).getState()}
        commandHandler={(request) => {
          requests.push(request);
          return { ok: true };
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByText("Thanks, we will be in touch.")).toBeTruthy();
    expect(requests).toEqual([{ name: "newsletter.subscribe", payload: { email: "ana@example.com", source: "news" } }]);
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("");
  });
});
