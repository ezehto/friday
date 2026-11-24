import { useState } from "react";
import { FIXED } from "./fixedText";

export function MotionSetting() {
  const [reduced, setReduced] = useState(() => document.documentElement.dataset.motion === "reduced");
  return (
    <label className="motion-setting">
      <input
        type="checkbox"
        checked={reduced}
        onChange={(e) => {
          setReduced(e.target.checked);
          if (e.target.checked) document.documentElement.dataset.motion = "reduced";
          else delete document.documentElement.dataset.motion;
        }}
      />
      {FIXED.motionLabel}
    </label>
  );
}
