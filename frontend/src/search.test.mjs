import test from "node:test";
import assert from "node:assert/strict";
import { readQueryType, readSearchSort, matchLabel, appendSearchPage } from "./search.ts";

test("drawn structures explicitly use SMILES; ambiguous manual input stays auto", () => {
  assert.equal(readQueryType(new URLSearchParams("q=CO")), "auto");
  assert.equal(readQueryType(new URLSearchParams("q=CO&source=draw")), "smiles");
  assert.equal(readQueryType(new URLSearchParams("q=CO&source=draw&query_type=formula")), "formula");
  assert.equal(readQueryType(new URLSearchParams("q=CO&query_type=unknown")), "auto");
});
test("search defaults to relevance; explicit sorting and browsing remain available", () => {
  assert.equal(readSearchSort(new URLSearchParams("q=ethanol")), "relevance");
  assert.equal(readSearchSort(new URLSearchParams()), "id");
  assert.equal(readSearchSort(new URLSearchParams("q=ethanol&sort=name")), "name");
  assert.equal(readSearchSort(new URLSearchParams("q=ethanol&sort=bad")), "relevance");
});
test("match descriptions come from server metadata, not query guesses", () => {
  assert.equal(matchLabel({field:"smiles_original",kind:"exact"}, "zh"), "SMILES 文本完全匹配");
  assert.equal(matchLabel({field:"compound_name",kind:"prefix"}, "en"), "Name prefix match");
  assert.equal(matchLabel(undefined, "zh"), "数据库记录");
});
test("loading more preserves backend ranking and does not duplicate records", () => {
  const exact = {uuid:"exact",id:"MSMOL-2"};
  const prefix = {uuid:"prefix",id:"MSMOL-1"};
  const contains = {uuid:"contains",id:"MSMOL-3"};
  assert.deepEqual(appendSearchPage([exact,prefix], [prefix,contains,contains]), [exact,prefix,contains]);
});
