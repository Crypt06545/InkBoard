/** Idea → Ready? → Ship it, with a Revise loop back to Idea. */
const FlowDiagram = () => (
  <svg
    className="flow w-full max-w-[460px] justify-self-center lg:justify-self-end"
    viewBox="0 0 446 240"
    aria-hidden="true"
  >
    {/* nodes */}
    <rect
      className="flow-node fill-hb-amber stroke-hb-ink"
      strokeWidth="2.4"
      strokeLinejoin="round"
      x="10"
      y="44"
      width="104"
      height="52"
      rx="12"
    />
    <polygon
      className="flow-node fill-hb-sky stroke-hb-ink"
      strokeWidth="2.4"
      strokeLinejoin="round"
      points="232,22 294,70 232,118 170,70"
    />
    <rect
      className="flow-node fill-hb-mint stroke-hb-ink"
      strokeWidth="2.4"
      strokeLinejoin="round"
      x="334"
      y="44"
      width="104"
      height="52"
      rx="12"
    />
    <rect
      className="flow-node fill-hb-peach stroke-hb-ink"
      strokeWidth="2.4"
      strokeLinejoin="round"
      x="180"
      y="168"
      width="104"
      height="52"
      rx="12"
    />

    {/* node labels */}
    <g
      className="flow-label fill-hb-paper-ink font-hand text-[22px]"
      textAnchor="middle"
    >
      <text x="62" y="77">
        Idea
      </text>
      <text x="232" y="77">
        Ready?
      </text>
      <text x="386" y="77">
        Ship it
      </text>
      <text x="232" y="201">
        Revise
      </text>
    </g>

    {/* branch labels */}
    <g className="flow-label fill-hb-muted font-hand text-lg">
      <text x="314" y="56" textAnchor="middle">
        Yes
      </text>
      <text x="246" y="148">
        No
      </text>
    </g>

    {/* arrows */}
    <g
      className="fill-none stroke-hb-ink"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path className="flow-line" d="M114 70H168M160 62L168 70L160 78" />
      <path className="flow-line" d="M294 70H334M326 62L334 70L326 78" />
      <path className="flow-line" d="M232 118V168M224 160L232 168L240 160" />
      <path className="flow-line" d="M180 194H62V100M54 108L62 100L70 108" />
    </g>
  </svg>
);

export default FlowDiagram;
