/**
 * The first name that proves a national number belongs to whoever typed it (account creation, the registration
 * desk). Run: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { firstNameMatches, getPerson } from "../lib/registry";

describe("firstNameMatches", () => {
  it("accepts the first name on the civil record", () => {
    assert.equal(firstNameMatches("01012345412", "محمد"), true);
  });

  it("accepts it as people write it: diacritics, hamza, ta marbuta, spaces", () => {
    assert.equal(firstNameMatches("01012345412", " مُحَمَّد "), true);
    assert.equal(firstNameMatches("01012349901", "عبدالله"), true);
    assert.equal(firstNameMatches("01012340078", "خديجه"), true);
  });

  it("refuses another name, an empty one, and an invalid number", () => {
    assert.equal(firstNameMatches("01012345412", "أحمد"), false);
    assert.equal(firstNameMatches("01012345412", "  "), false);
    assert.equal(firstNameMatches("0101234541", "محمد"), false);
  });

  it("works for a number outside the demo's named people, with its own first name only", () => {
    const id = "09099912345";
    const name = getPerson(id)!.firstName;
    assert.equal(firstNameMatches(id, name), true);
    assert.equal(firstNameMatches(id, name === "محمد" ? "علي" : "محمد"), false);
  });
});
