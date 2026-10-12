// Every surface says where a transcript came from with these helpers: a
// recorded demo transcript is never described as typed.

import { describe, expect, it } from "vitest";
import { fixtureSource, noAudioReason, transcriptSourceLabel, typedSource, webSpeechSource } from "../asr-sources";

describe("transcript source wording", () => {
  it("labels a recorded demo transcript as such, without its internal fixture id", () => {
    expect(transcriptSourceLabel(fixtureSource("capture-closeout-chw-r2"))).toBe("Recorded demo transcript · no audio");
  });

  it("says why there is no audio, per source", () => {
    expect(noAudioReason(fixtureSource("capture-closeout-chw-r2"))).toBe(
      "No audio was recorded: this is a recorded demo transcript, written for the demo.",
    );
    expect(noAudioReason(typedSource())).toBe("No audio was recorded: the note was typed.");
    expect(noAudioReason(webSpeechSource(false))).toBeNull();
  });
});
