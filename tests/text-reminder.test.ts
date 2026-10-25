import { describe, expect, it } from "vitest";
import { textReminder } from "../lib/text-reminder";

describe("text reminders", () => {
  it("uses the saved secretary name and appointment details", () => {
    expect(textReminder("  Jane Smith", "Sunday, November 29", "4:50 PM", " Colton Inkley ")).toBe("Hi Jane, this is Colton Inkley reminding you of your tithing declaration with the Bishop on Sunday, November 29 at 4:50 PM in the Bishop's office.");
  });
  it("keeps the existing wording when the name is blank", () => {
    expect(textReminder("Jane Smith", "Sunday", "4:50 PM", " ")).toContain("this is the ward executive secretary reminding you");
  });
});
