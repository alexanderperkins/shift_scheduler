import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home page", () => {
  it("links organizers to the shift list", () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toMatch(/<a[^>]*href="\/shifts"[^>]*>View shifts<\/a>/);
  });
});
