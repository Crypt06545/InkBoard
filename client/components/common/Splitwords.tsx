type SplitWordsProps = {
  text: string;
  /** class applied to each moving word, used as the GSAP selector */
  wordClass: string;
};

/** Wraps each word in a clipping mask so GSAP can slide it up into view. */
const SplitWords = ({ text, wordClass }: SplitWordsProps) => (
  <>
    {text.split(" ").map((word, i) => (
      <span
        key={`${word}-${i}`}
        className="inline-block overflow-hidden pb-[0.12em] align-bottom"
      >
        <span className={`${wordClass} inline-block will-change-transform`}>
          {word}
        </span>
        {"\u00A0"}
      </span>
    ))}
  </>
);

export default SplitWords;
