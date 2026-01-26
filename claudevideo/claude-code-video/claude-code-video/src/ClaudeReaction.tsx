import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

// EVEN BIGGER mascot size (scaled for 2K resolution)
const BASE_SIZE = 1600;

type Emotion = "angry" | "happy" | "sad" | "laughing" | "thinking" | "surprised" | "love" | "cool";

// ============================================
// BACKGROUNDS
// ============================================

const AngryBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.15) * 0.3 + 0.7;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%,
          hsl(0, 80%, ${20 + pulse * 15}%) 0%,
          hsl(0, 90%, ${8 + pulse * 5}%) 60%,
          hsl(0, 100%, 3%) 100%
        )`,
      }}
    />
  );
};

const HappyBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.1) * 0.3 + 0.7;
  const hue = 40 + Math.sin(frame * 0.05) * 10;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%,
          hsl(${hue}, 90%, ${35 + pulse * 15}%) 0%,
          hsl(${hue + 20}, 85%, ${20 + pulse * 10}%) 60%,
          hsl(${hue + 30}, 80%, 8%) 100%
        )`,
      }}
    />
  );
};

const SadBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.05) * 0.2 + 0.8;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%,
          hsl(220, 60%, ${18 + pulse * 8}%) 0%,
          hsl(240, 70%, ${10 + pulse * 5}%) 60%,
          hsl(250, 80%, 4%) 100%
        )`,
      }}
    />
  );
};

const LaughingBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.12) * 0.3 + 0.7;
  const hue = (frame * 2) % 60 + 20;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%,
          hsl(${hue}, 85%, ${30 + pulse * 15}%) 0%,
          hsl(${hue + 15}, 80%, ${18 + pulse * 8}%) 60%,
          hsl(${hue + 25}, 75%, 6%) 100%
        )`,
      }}
    />
  );
};

// NEW BACKGROUNDS

const ThinkingBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.04) * 0.2 + 0.8;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%,
          hsl(260, 50%, ${22 + pulse * 10}%) 0%,
          hsl(270, 60%, ${12 + pulse * 6}%) 60%,
          hsl(280, 70%, 5%) 100%
        )`,
      }}
    />
  );
};

const SurprisedBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const flash = Math.sin(frame * 0.15) * 0.3 + 0.7;
  const hue = 45 + Math.sin(frame * 0.08) * 15;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%,
          hsl(${hue}, 90%, ${35 + flash * 20}%) 0%,
          hsl(${hue + 10}, 85%, ${20 + flash * 10}%) 60%,
          hsl(${hue + 20}, 80%, 6%) 100%
        )`,
      }}
    />
  );
};

const LoveBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.06) * 0.25 + 0.75;
  const hue = 340 + Math.sin(frame * 0.03) * 10;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%,
          hsl(${hue}, 80%, ${30 + pulse * 15}%) 0%,
          hsl(${hue - 10}, 75%, ${18 + pulse * 8}%) 60%,
          hsl(${hue - 20}, 70%, 6%) 100%
        )`,
      }}
    />
  );
};

const CoolBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.05) * 0.2 + 0.8;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%,
          hsl(200, 70%, ${20 + pulse * 12}%) 0%,
          hsl(210, 80%, ${10 + pulse * 6}%) 60%,
          hsl(220, 90%, 4%) 100%
        )`,
      }}
    />
  );
};

// ============================================
// SYMBOL EMOJIS AROUND/BEHIND CHARACTER (NO FACES!)
// ============================================

// Angry: 💢 anger symbols, 🔥 fire, 😠😡🤬 faces - AROUND the character - BIGGER & SLOWER
const AngrySymbols: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.15) * 0.2 + 1;
  const shake = Math.sin(frame * 0.5) * 10;
  const fastShake = Math.sin(frame * 0.8) * 6;
  const bounce = Math.abs(Math.sin(frame * 0.1)) * 20;

  return (
    <>
      {/* 💢 Anger symbols - BOUNCING and ROTATING */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: `${6 + bounce * 0.3}%`,
          transform: `translate(-50%, -50%) translate(${160 + shake}px, 0) rotate(${15 + shake}deg) scale(${pulse})`,
          fontSize: 280,
          filter: "drop-shadow(0 0 50px rgba(255, 0, 0, 0.9))",
        }}
      >
        💢
      </div>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: `${10 + bounce * 0.2}%`,
          transform: `translate(-50%, -50%) translate(${-200 + shake}px, 0) rotate(${-15 - shake}deg) scale(${pulse * 0.9})`,
          fontSize: 220,
          filter: "drop-shadow(0 0 40px rgba(255, 0, 0, 0.8))",
        }}
      >
        💢
      </div>

      {/* 🔥 Fire - FLICKERING */}
      <div
        style={{
          position: "absolute",
          left: "5%",
          top: `${48 + Math.sin(frame * 0.1) * 3}%`,
          transform: `translate(-50%, -50%) scale(${0.9 + Math.sin(frame * 0.15) * 0.15}) rotate(${fastShake}deg)`,
          fontSize: 220,
          filter: "drop-shadow(0 0 60px rgba(255, 100, 0, 0.9))",
        }}
      >
        🔥
      </div>
      <div
        style={{
          position: "absolute",
          left: "95%",
          top: `${48 + Math.sin(frame * 0.1 + 1) * 3}%`,
          transform: `translate(-50%, -50%) scale(${0.9 + Math.sin(frame * 0.15 + 1) * 0.15}) rotate(${-fastShake}deg)`,
          fontSize: 220,
          filter: "drop-shadow(0 0 60px rgba(255, 100, 0, 0.9))",
        }}
      >
        🔥
      </div>

      {/* 😠😡🤬😤 Angry faces - SHAKING and BOUNCING */}
      <div
        style={{
          position: "absolute",
          left: `${8 + fastShake * 0.2}%`,
          top: `${18 + bounce * 0.3}%`,
          transform: `translate(-50%, -50%) rotate(${-10 + shake * 0.5}deg) scale(${0.9 + Math.sin(frame * 0.12) * 0.1})`,
          fontSize: 200,
          filter: "drop-shadow(0 0 40px rgba(255, 50, 50, 0.7))",
        }}
      >
        😠
      </div>
      <div
        style={{
          position: "absolute",
          left: `${92 - fastShake * 0.2}%`,
          top: `${18 + bounce * 0.4}%`,
          transform: `translate(-50%, -50%) rotate(${10 - shake * 0.5}deg) scale(${0.9 + Math.sin(frame * 0.12 + 1) * 0.1})`,
          fontSize: 200,
          filter: "drop-shadow(0 0 40px rgba(255, 50, 50, 0.7))",
        }}
      >
        😡
      </div>
      <div
        style={{
          position: "absolute",
          left: `${10 + fastShake * 0.15}%`,
          top: `${82 - bounce * 0.2}%`,
          transform: `translate(-50%, -50%) rotate(${-6 + shake * 0.4}deg) scale(${0.85 + Math.sin(frame * 0.14) * 0.1})`,
          fontSize: 180,
          filter: "drop-shadow(0 0 35px rgba(255, 50, 50, 0.6))",
        }}
      >
        🤬
      </div>
      <div
        style={{
          position: "absolute",
          left: `${90 - fastShake * 0.15}%`,
          top: `${82 - bounce * 0.3}%`,
          transform: `translate(-50%, -50%) rotate(${6 - shake * 0.4}deg) scale(${0.85 + Math.sin(frame * 0.14 + 1) * 0.1})`,
          fontSize: 180,
          filter: "drop-shadow(0 0 35px rgba(255, 50, 50, 0.6))",
        }}
      >
        😤
      </div>
    </>
  );
};

// Happy: ✨ sparkles, 💕 hearts, 😊😄🥰 faces - AROUND the character - BIGGER & SLOWER
const HappySymbols: React.FC = () => {
  const frame = useCurrentFrame();
  const bounce = Math.sin(frame * 0.06) * 25;
  const pulse = Math.sin(frame * 0.08) * 0.15 + 1;

  // Orbiting sparkles - SLOWER - BIGGER
  const orbitingSymbols = [
    { emoji: "✨", distance: 850, speed: 0.8, size: 160, offset: 0 },
    { emoji: "⭐", distance: 880, speed: -0.6, size: 150, offset: 60 },
    { emoji: "✨", distance: 820, speed: 0.7, size: 150, offset: 120 },
    { emoji: "🌟", distance: 900, speed: -0.5, size: 160, offset: 180 },
    { emoji: "✨", distance: 840, speed: 0.65, size: 140, offset: 240 },
    { emoji: "⭐", distance: 860, speed: -0.7, size: 150, offset: 300 },
  ];

  return (
    <>
      {/* Orbiting sparkles - SPINNING SLOWER */}
      {orbitingSymbols.map((s, i) => {
        const angle = s.offset + frame * s.speed;
        const x = Math.cos((angle * Math.PI) / 180) * s.distance;
        const y = Math.sin((angle * Math.PI) / 180) * s.distance;
        const twinkle = Math.sin(frame * 0.1 + i) * 0.3 + 0.7;
        const spinScale = 0.85 + Math.sin(frame * 0.08 + i * 0.5) * 0.2;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: `translate(-50%, -50%) rotate(${frame * 1.5}deg) scale(${spinScale})`,
              fontSize: s.size,
              opacity: twinkle,
              filter: "drop-shadow(0 0 45px rgba(255, 215, 0, 0.9))",
            }}
          >
            {s.emoji}
          </div>
        );
      })}

      {/* Floating hearts - BOUNCING SLOWER */}
      {[
        { x: "8%", y: "50%", delay: 0, emoji: "💕" },
        { x: "92%", y: "50%", delay: 15, emoji: "💖" },
        { x: "50%", y: "92%", delay: 30, emoji: "💗" },
      ].map((h, i) => {
        const heartBounce = Math.sin((frame + h.delay) * 0.07) * 35;
        const heartScale = 0.8 + Math.sin((frame + h.delay) * 0.09) * 0.25;
        const heartRotate = Math.sin((frame + h.delay) * 0.05) * 10;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: h.x,
              top: `calc(${h.y} + ${heartBounce}px)`,
              transform: `translate(-50%, -50%) scale(${heartScale}) rotate(${heartRotate}deg)`,
              fontSize: 170,
              filter: "drop-shadow(0 0 40px rgba(255, 100, 150, 0.8))",
            }}
          >
            {h.emoji}
          </div>
        );
      })}

      {/* 😊😄🥰😍 Happy faces - BOUNCING SLOWER */}
      <div
        style={{
          position: "absolute",
          left: `${8 + Math.sin(frame * 0.04) * 2}%`,
          top: `${18 + bounce * 0.4}%`,
          transform: `translate(-50%, -50%) rotate(${Math.sin(frame * 0.05) * 12}deg) scale(${0.9 + Math.sin(frame * 0.07) * 0.1})`,
          fontSize: 210,
          filter: "drop-shadow(0 0 45px rgba(255, 200, 0, 0.7))",
        }}
      >
        😊
      </div>
      <div
        style={{
          position: "absolute",
          left: `${92 - Math.sin(frame * 0.04) * 2}%`,
          top: `${18 + bounce * 0.5}%`,
          transform: `translate(-50%, -50%) rotate(${Math.sin(frame * 0.05 + 1) * 12}deg) scale(${0.9 + Math.sin(frame * 0.07 + 1) * 0.1})`,
          fontSize: 210,
          filter: "drop-shadow(0 0 45px rgba(255, 200, 0, 0.7))",
        }}
      >
        😄
      </div>
      <div
        style={{
          position: "absolute",
          left: `${10 + Math.sin(frame * 0.05) * 2}%`,
          top: `${82 - bounce * 0.3}%`,
          transform: `translate(-50%, -50%) rotate(${Math.sin(frame * 0.05 + 2) * 10}deg) scale(${0.85 + Math.sin(frame * 0.08) * 0.12})`,
          fontSize: 180,
          filter: "drop-shadow(0 0 38px rgba(255, 150, 200, 0.7))",
        }}
      >
        🥰
      </div>
      <div
        style={{
          position: "absolute",
          left: `${90 - Math.sin(frame * 0.05) * 2}%`,
          top: `${82 - bounce * 0.4}%`,
          transform: `translate(-50%, -50%) rotate(${Math.sin(frame * 0.05 + 3) * 10}deg) scale(${0.85 + Math.sin(frame * 0.08 + 1) * 0.12})`,
          fontSize: 180,
          filter: "drop-shadow(0 0 38px rgba(255, 150, 200, 0.7))",
        }}
      >
        😍
      </div>
    </>
  );
};

// Sad: 💧 teardrops, 💔 broken hearts, 😢😭😞 faces - AROUND the character - BIGGER & SLOWER
const SadSymbols: React.FC = () => {
  const frame = useCurrentFrame();
  const droop = Math.sin(frame * 0.03) * 12;
  const sway = Math.sin(frame * 0.02) * 10;

  // Falling teardrops - SLOWER - BIGGER
  const teardrops = [
    { x: -700, delay: 0 },
    { x: -500, delay: 20 },
    { x: -300, delay: 40 },
    { x: 300, delay: 60 },
    { x: 500, delay: 80 },
    { x: 700, delay: 100 },
    { x: -600, delay: 50 },
    { x: 600, delay: 75 },
  ];

  return (
    <>
      {/* Rain cloud at top - SWAYING SLOWER */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: `${7 + Math.sin(frame * 0.015) * 1.5}%`,
          transform: `translate(-50%, -50%) translateX(${Math.sin(frame * 0.02) * 40}px) scale(${0.95 + Math.sin(frame * 0.025) * 0.08})`,
          fontSize: 300,
          opacity: 0.8,
          filter: "drop-shadow(0 0 50px rgba(100, 150, 200, 0.6))",
        }}
      >
        🌧️
      </div>

      {/* Falling teardrops - SLOWER */}
      {teardrops.map((t, i) => {
        const cycleLength = 120;
        const progress = ((frame + t.delay) % cycleLength) / cycleLength;
        const y = -500 + progress * 1800;
        const opacity = interpolate(progress, [0, 0.1, 0.8, 1], [0, 1, 1, 0]);
        const wobble = Math.sin((frame + t.delay) * 0.05) * 20;
        const scale = 0.8 + Math.sin(progress * Math.PI) * 0.25;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${t.x + wobble}px)`,
              top: `calc(25% + ${y}px)`,
              fontSize: 140,
              opacity,
              transform: `scale(${scale})`,
              filter: "drop-shadow(0 0 35px rgba(100, 180, 255, 0.7))",
            }}
          >
            💧
          </div>
        );
      })}

      {/* 😢😭😞😿 Sad faces - DROOPING and SWAYING SLOWER */}
      <div
        style={{
          position: "absolute",
          left: `${8 + sway * 0.2}%`,
          top: `${22 + droop * 0.4}%`,
          transform: `translate(-50%, -50%) rotate(${-8 + droop * 0.5}deg) scale(${0.9 + Math.sin(frame * 0.03) * 0.08})`,
          fontSize: 200,
          filter: "drop-shadow(0 0 35px rgba(100, 150, 200, 0.6))",
        }}
      >
        😢
      </div>
      <div
        style={{
          position: "absolute",
          left: `${92 - sway * 0.2}%`,
          top: `${22 + droop * 0.5}%`,
          transform: `translate(-50%, -50%) rotate(${8 - droop * 0.5}deg) scale(${0.9 + Math.sin(frame * 0.03 + 1) * 0.08})`,
          fontSize: 200,
          filter: "drop-shadow(0 0 35px rgba(100, 150, 200, 0.6))",
        }}
      >
        😭
      </div>
      <div
        style={{
          position: "absolute",
          left: `${10 + sway * 0.15}%`,
          top: `${80 + droop * 0.25}%`,
          transform: `translate(-50%, -50%) rotate(${-5 + droop * 0.3}deg) scale(${0.85 + Math.sin(frame * 0.035) * 0.08})`,
          fontSize: 175,
          filter: "drop-shadow(0 0 30px rgba(100, 150, 200, 0.5))",
        }}
      >
        😞
      </div>
      <div
        style={{
          position: "absolute",
          left: `${90 - sway * 0.15}%`,
          top: `${80 + droop * 0.3}%`,
          transform: `translate(-50%, -50%) rotate(${5 - droop * 0.3}deg) scale(${0.85 + Math.sin(frame * 0.035 + 1) * 0.08})`,
          fontSize: 175,
          filter: "drop-shadow(0 0 30px rgba(100, 150, 200, 0.5))",
        }}
      >
        😿
      </div>

      {/* Broken hearts - PULSING SADLY SLOWER */}
      <div
        style={{
          position: "absolute",
          left: `${5 + sway * 0.15}%`,
          top: "50%",
          transform: `translate(-50%, -50%) rotate(${-10 + droop * 0.5}deg) scale(${0.8 + Math.sin(frame * 0.04) * 0.1})`,
          fontSize: 170,
          opacity: 0.75,
          filter: "drop-shadow(0 0 30px rgba(150, 100, 150, 0.5))",
        }}
      >
        💔
      </div>
      <div
        style={{
          position: "absolute",
          left: `${95 - sway * 0.15}%`,
          top: "50%",
          transform: `translate(-50%, -50%) rotate(${10 - droop * 0.5}deg) scale(${0.8 + Math.sin(frame * 0.04 + 1) * 0.1})`,
          fontSize: 170,
          opacity: 0.75,
          filter: "drop-shadow(0 0 30px rgba(150, 100, 150, 0.5))",
        }}
      >
        💔
      </div>
    </>
  );
};

// Laughing: 😂🤣😆😹 faces + 💦 tears - AROUND the character - BIGGER & SLOWER
const LaughingSymbols: React.FC = () => {
  const frame = useCurrentFrame();
  const bounce = Math.abs(Math.sin(frame * 0.08)) * 30;
  const shake = Math.sin(frame * 0.2) * 12;
  const fastShake = Math.sin(frame * 0.3) * 8;

  // Flying joy tears 💦 - SLOWER - BIGGER
  const joyTears = [
    { startX: -400, dir: -1, delay: 0 },
    { startX: 400, dir: 1, delay: 0 },
    { startX: -400, dir: -1, delay: 30 },
    { startX: 400, dir: 1, delay: 30 },
    { startX: -400, dir: -1, delay: 60 },
    { startX: 400, dir: 1, delay: 60 },
  ];

  return (
    <>
      {/* 😂🤣😆😹 Laughing faces - BOUNCING SLOWER */}
      <div
        style={{
          position: "absolute",
          left: `${8 + fastShake * 0.3}%`,
          top: `${16 + bounce * 0.5}%`,
          transform: `translate(-50%, -50%) rotate(${-12 + shake}deg) scale(${0.9 + Math.sin(frame * 0.1) * 0.15})`,
          fontSize: 230,
          filter: "drop-shadow(0 0 50px rgba(255, 200, 0, 0.8))",
        }}
      >
        😂
      </div>
      <div
        style={{
          position: "absolute",
          left: `${92 - fastShake * 0.3}%`,
          top: `${16 + bounce * 0.6}%`,
          transform: `translate(-50%, -50%) rotate(${12 - shake}deg) scale(${0.9 + Math.sin(frame * 0.1 + 1) * 0.15})`,
          fontSize: 230,
          filter: "drop-shadow(0 0 50px rgba(255, 200, 0, 0.8))",
        }}
      >
        🤣
      </div>
      <div
        style={{
          position: "absolute",
          left: `${5 + fastShake * 0.25}%`,
          top: `${50 + bounce * 0.3}%`,
          transform: `translate(-50%, -50%) rotate(${-10 + shake * 0.8}deg) scale(${0.85 + Math.sin(frame * 0.12) * 0.12})`,
          fontSize: 200,
          filter: "drop-shadow(0 0 45px rgba(255, 200, 0, 0.7))",
        }}
      >
        😆
      </div>
      <div
        style={{
          position: "absolute",
          left: `${95 - fastShake * 0.25}%`,
          top: `${50 + bounce * 0.4}%`,
          transform: `translate(-50%, -50%) rotate(${10 - shake * 0.8}deg) scale(${0.85 + Math.sin(frame * 0.12 + 1) * 0.12})`,
          fontSize: 200,
          filter: "drop-shadow(0 0 45px rgba(255, 200, 0, 0.7))",
        }}
      >
        😹
      </div>
      <div
        style={{
          position: "absolute",
          left: `${10 + fastShake * 0.2}%`,
          top: `${84 - bounce * 0.25}%`,
          transform: `translate(-50%, -50%) rotate(${-8 + shake * 0.6}deg) scale(${0.8 + Math.sin(frame * 0.14) * 0.12})`,
          fontSize: 180,
          filter: "drop-shadow(0 0 38px rgba(255, 200, 0, 0.7))",
        }}
      >
        🤣
      </div>
      <div
        style={{
          position: "absolute",
          left: `${90 - fastShake * 0.2}%`,
          top: `${84 - bounce * 0.3}%`,
          transform: `translate(-50%, -50%) rotate(${8 - shake * 0.6}deg) scale(${0.8 + Math.sin(frame * 0.14 + 1) * 0.12})`,
          fontSize: 180,
          filter: "drop-shadow(0 0 38px rgba(255, 200, 0, 0.7))",
        }}
      >
        😂
      </div>

      {/* Flying joy tears 💦 - SHOOTING OUT SLOWER */}
      {joyTears.map((t, i) => {
        const cycleLength = 70;
        const progress = ((frame + t.delay) % cycleLength) / cycleLength;
        const x = t.startX + t.dir * progress * 360;
        const y = -200 + progress * 300 + Math.sin(progress * Math.PI) * -120;
        const opacity = Math.sin(progress * Math.PI);
        const rotation = t.dir * progress * 40;
        const scale = 0.8 + Math.sin(progress * Math.PI) * 0.3;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${x}px)`,
              top: `calc(35% + ${y}px)`,
              transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`,
              fontSize: 130,
              opacity,
              filter: "drop-shadow(0 0 35px rgba(255, 220, 100, 0.8))",
            }}
          >
            💦
          </div>
        );
      })}
    </>
  );
};

// NEW SYMBOL COMPONENTS

// Thinking: 🤔💭❓🧠 - contemplative, floating thought bubbles
const ThinkingSymbols: React.FC = () => {
  const frame = useCurrentFrame();
  const float = Math.sin(frame * 0.04) * 15;
  const pulse = Math.sin(frame * 0.05) * 0.1 + 1;

  // Floating thought bubbles
  const thoughtBubbles = [
    { x: 300, y: -200, size: 120, delay: 0 },
    { x: 380, y: -320, size: 160, delay: 10 },
    { x: 450, y: -480, size: 220, delay: 20 },
  ];

  return (
    <>
      {/* Thought bubbles trailing up-right */}
      {thoughtBubbles.map((b, i) => {
        const bobble = Math.sin((frame + b.delay) * 0.05) * 12;
        const scale = pulse + Math.sin((frame + b.delay) * 0.04) * 0.08;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${b.x}px)`,
              top: `calc(50% + ${b.y + bobble}px)`,
              width: b.size * scale,
              height: b.size * scale,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.85)",
              filter: "drop-shadow(0 0 30px rgba(200, 180, 255, 0.6))",
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}

      {/* Main thought cloud with ❓ */}
      <div
        style={{
          position: "absolute",
          left: "calc(50% + 550px)",
          top: `calc(35% + ${float}px)`,
          transform: `translate(-50%, -50%) scale(${pulse})`,
          fontSize: 280,
          filter: "drop-shadow(0 0 40px rgba(200, 180, 255, 0.8))",
        }}
      >
        💭
      </div>

      {/* 🤔 faces around */}
      <div
        style={{
          position: "absolute",
          left: `${8 + Math.sin(frame * 0.03) * 2}%`,
          top: `${20 + float * 0.3}%`,
          transform: `translate(-50%, -50%) rotate(${Math.sin(frame * 0.04) * 8}deg) scale(${0.9 + Math.sin(frame * 0.05) * 0.08})`,
          fontSize: 200,
          filter: "drop-shadow(0 0 40px rgba(200, 180, 255, 0.7))",
        }}
      >
        🤔
      </div>
      <div
        style={{
          position: "absolute",
          left: `${92 - Math.sin(frame * 0.03) * 2}%`,
          top: `${80 + float * 0.4}%`,
          transform: `translate(-50%, -50%) rotate(${Math.sin(frame * 0.04 + 1) * 8}deg) scale(${0.9 + Math.sin(frame * 0.05 + 1) * 0.08})`,
          fontSize: 180,
          filter: "drop-shadow(0 0 35px rgba(200, 180, 255, 0.7))",
        }}
      >
        🤔
      </div>

      {/* ❓ question marks floating */}
      <div
        style={{
          position: "absolute",
          left: `${10 + Math.sin(frame * 0.035) * 3}%`,
          top: `${75 + Math.sin(frame * 0.04) * 10}%`,
          transform: `translate(-50%, -50%) rotate(${Math.sin(frame * 0.03) * 15}deg) scale(${0.85 + Math.sin(frame * 0.06) * 0.1})`,
          fontSize: 170,
          filter: "drop-shadow(0 0 35px rgba(200, 180, 255, 0.6))",
        }}
      >
        ❓
      </div>
      <div
        style={{
          position: "absolute",
          left: `${88 - Math.sin(frame * 0.035) * 3}%`,
          top: `${22 + Math.sin(frame * 0.04 + 1) * 10}%`,
          transform: `translate(-50%, -50%) rotate(${Math.sin(frame * 0.03 + 1) * 15}deg) scale(${0.85 + Math.sin(frame * 0.06 + 1) * 0.1})`,
          fontSize: 160,
          filter: "drop-shadow(0 0 30px rgba(200, 180, 255, 0.6))",
        }}
      >
        ❓
      </div>

      {/* 🧠 brain */}
      <div
        style={{
          position: "absolute",
          left: `${5 + Math.sin(frame * 0.025) * 2}%`,
          top: `${50 + Math.sin(frame * 0.03) * 8}%`,
          transform: `translate(-50%, -50%) scale(${0.8 + Math.sin(frame * 0.04) * 0.1})`,
          fontSize: 150,
          filter: "drop-shadow(0 0 30px rgba(255, 150, 200, 0.5))",
        }}
      >
        🧠
      </div>
    </>
  );
};

// Surprised: 😱😲⚡❗ - shock, startle
const SurprisedSymbols: React.FC = () => {
  const frame = useCurrentFrame();
  const jolt = Math.sin(frame * 0.3) * 8;
  const flash = Math.abs(Math.sin(frame * 0.15)) * 0.3 + 0.7;

  return (
    <>
      {/* ⚡ lightning bolts */}
      <div
        style={{
          position: "absolute",
          left: `${15 + jolt * 0.5}%`,
          top: `${15 + Math.sin(frame * 0.2) * 5}%`,
          transform: `translate(-50%, -50%) rotate(${-20 + jolt}deg) scale(${flash})`,
          fontSize: 250,
          filter: "drop-shadow(0 0 50px rgba(255, 220, 0, 0.9))",
        }}
      >
        ⚡
      </div>
      <div
        style={{
          position: "absolute",
          left: `${85 - jolt * 0.5}%`,
          top: `${15 + Math.sin(frame * 0.2 + 1) * 5}%`,
          transform: `translate(-50%, -50%) rotate(${20 - jolt}deg) scale(${flash})`,
          fontSize: 250,
          filter: "drop-shadow(0 0 50px rgba(255, 220, 0, 0.9))",
        }}
      >
        ⚡
      </div>

      {/* ❗ exclamation marks */}
      <div
        style={{
          position: "absolute",
          left: `${50 + Math.sin(frame * 0.15) * 100}%`,
          top: `${8 + Math.abs(Math.sin(frame * 0.2)) * 5}%`,
          transform: `translate(-50%, -50%) scale(${0.9 + Math.sin(frame * 0.25) * 0.15})`,
          fontSize: 220,
          filter: "drop-shadow(0 0 45px rgba(255, 100, 100, 0.8))",
        }}
      >
        ❗
      </div>
      <div
        style={{
          position: "absolute",
          left: `${50 - Math.sin(frame * 0.15) * 80}%`,
          top: `${10 + Math.abs(Math.sin(frame * 0.2 + 0.5)) * 5}%`,
          transform: `translate(-50%, -50%) scale(${0.85 + Math.sin(frame * 0.25 + 1) * 0.12})`,
          fontSize: 180,
          filter: "drop-shadow(0 0 40px rgba(255, 100, 100, 0.7))",
        }}
      >
        ❗
      </div>

      {/* 😱😲 shocked faces */}
      <div
        style={{
          position: "absolute",
          left: `${8 + jolt * 0.4}%`,
          top: `${50 + Math.sin(frame * 0.15) * 8}%`,
          transform: `translate(-50%, -50%) rotate(${-10 + jolt * 0.8}deg) scale(${0.9 + Math.sin(frame * 0.18) * 0.1})`,
          fontSize: 200,
          filter: "drop-shadow(0 0 40px rgba(255, 200, 100, 0.7))",
        }}
      >
        😱
      </div>
      <div
        style={{
          position: "absolute",
          left: `${92 - jolt * 0.4}%`,
          top: `${50 + Math.sin(frame * 0.15 + 1) * 8}%`,
          transform: `translate(-50%, -50%) rotate(${10 - jolt * 0.8}deg) scale(${0.9 + Math.sin(frame * 0.18 + 1) * 0.1})`,
          fontSize: 200,
          filter: "drop-shadow(0 0 40px rgba(255, 200, 100, 0.7))",
        }}
      >
        😲
      </div>
      <div
        style={{
          position: "absolute",
          left: `${12 + jolt * 0.3}%`,
          top: `${82 + Math.sin(frame * 0.12) * 6}%`,
          transform: `translate(-50%, -50%) rotate(${-8 + jolt * 0.5}deg) scale(${0.85 + Math.sin(frame * 0.15) * 0.1})`,
          fontSize: 170,
          filter: "drop-shadow(0 0 35px rgba(255, 200, 100, 0.6))",
        }}
      >
        😲
      </div>
      <div
        style={{
          position: "absolute",
          left: `${88 - jolt * 0.3}%`,
          top: `${82 + Math.sin(frame * 0.12 + 1) * 6}%`,
          transform: `translate(-50%, -50%) rotate(${8 - jolt * 0.5}deg) scale(${0.85 + Math.sin(frame * 0.15 + 1) * 0.1})`,
          fontSize: 170,
          filter: "drop-shadow(0 0 35px rgba(255, 200, 100, 0.6))",
        }}
      >
        😱
      </div>

      {/* 💥 impact burst */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: `${90 + Math.sin(frame * 0.1) * 3}%`,
          transform: `translate(-50%, -50%) scale(${0.8 + Math.sin(frame * 0.2) * 0.15})`,
          fontSize: 180,
          filter: "drop-shadow(0 0 40px rgba(255, 150, 0, 0.7))",
        }}
      >
        💥
      </div>
    </>
  );
};

// Love: 😍🥰💕💖💗 - hearts everywhere, dreamy
const LoveSymbols: React.FC = () => {
  const frame = useCurrentFrame();
  const float = Math.sin(frame * 0.04) * 12;
  const pulse = Math.sin(frame * 0.06) * 0.12 + 1;

  // Floating hearts rising
  const floatingHearts = [
    { x: -600, delay: 0, size: 140 },
    { x: -400, delay: 20, size: 120 },
    { x: -200, delay: 40, size: 130 },
    { x: 200, delay: 60, size: 125 },
    { x: 400, delay: 80, size: 135 },
    { x: 600, delay: 100, size: 140 },
  ];

  return (
    <>
      {/* Rising hearts */}
      {floatingHearts.map((h, i) => {
        const cycleLength = 150;
        const progress = ((frame + h.delay) % cycleLength) / cycleLength;
        const y = 600 - progress * 1400;
        const opacity = Math.sin(progress * Math.PI);
        const wobble = Math.sin((frame + h.delay) * 0.05) * 30;
        const heartEmojis = ["💕", "💖", "💗", "💓", "💝", "💘"];

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${h.x + wobble}px)`,
              top: `calc(50% + ${y}px)`,
              fontSize: h.size,
              opacity,
              transform: `translate(-50%, -50%) rotate(${Math.sin((frame + h.delay) * 0.03) * 15}deg)`,
              filter: "drop-shadow(0 0 30px rgba(255, 100, 150, 0.7))",
            }}
          >
            {heartEmojis[i % heartEmojis.length]}
          </div>
        );
      })}

      {/* 😍🥰 love faces */}
      <div
        style={{
          position: "absolute",
          left: `${8 + Math.sin(frame * 0.035) * 2}%`,
          top: `${18 + float * 0.4}%`,
          transform: `translate(-50%, -50%) rotate(${Math.sin(frame * 0.04) * 10}deg) scale(${0.9 + Math.sin(frame * 0.05) * 0.1})`,
          fontSize: 210,
          filter: "drop-shadow(0 0 45px rgba(255, 100, 150, 0.7))",
        }}
      >
        😍
      </div>
      <div
        style={{
          position: "absolute",
          left: `${92 - Math.sin(frame * 0.035) * 2}%`,
          top: `${18 + float * 0.5}%`,
          transform: `translate(-50%, -50%) rotate(${Math.sin(frame * 0.04 + 1) * 10}deg) scale(${0.9 + Math.sin(frame * 0.05 + 1) * 0.1})`,
          fontSize: 210,
          filter: "drop-shadow(0 0 45px rgba(255, 100, 150, 0.7))",
        }}
      >
        🥰
      </div>
      <div
        style={{
          position: "absolute",
          left: `${10 + Math.sin(frame * 0.04) * 2}%`,
          top: `${82 - float * 0.3}%`,
          transform: `translate(-50%, -50%) rotate(${Math.sin(frame * 0.04 + 2) * 8}deg) scale(${0.85 + Math.sin(frame * 0.055) * 0.1})`,
          fontSize: 180,
          filter: "drop-shadow(0 0 38px rgba(255, 100, 150, 0.6))",
        }}
      >
        🥰
      </div>
      <div
        style={{
          position: "absolute",
          left: `${90 - Math.sin(frame * 0.04) * 2}%`,
          top: `${82 - float * 0.4}%`,
          transform: `translate(-50%, -50%) rotate(${Math.sin(frame * 0.04 + 3) * 8}deg) scale(${0.85 + Math.sin(frame * 0.055 + 1) * 0.1})`,
          fontSize: 180,
          filter: "drop-shadow(0 0 38px rgba(255, 100, 150, 0.6))",
        }}
      >
        😍
      </div>

      {/* Big hearts on sides */}
      <div
        style={{
          position: "absolute",
          left: `${5 + Math.sin(frame * 0.03) * 2}%`,
          top: `${50 + float * 0.5}%`,
          transform: `translate(-50%, -50%) scale(${pulse}) rotate(${Math.sin(frame * 0.035) * 12}deg)`,
          fontSize: 200,
          filter: "drop-shadow(0 0 45px rgba(255, 50, 100, 0.8))",
        }}
      >
        💖
      </div>
      <div
        style={{
          position: "absolute",
          left: `${95 - Math.sin(frame * 0.03) * 2}%`,
          top: `${50 + float * 0.6}%`,
          transform: `translate(-50%, -50%) scale(${pulse}) rotate(${Math.sin(frame * 0.035 + 1) * 12}deg)`,
          fontSize: 200,
          filter: "drop-shadow(0 0 45px rgba(255, 50, 100, 0.8))",
        }}
      >
        💗
      </div>
    </>
  );
};

// Cool: 😎🆒✨🔥 - confident swagger
const CoolSymbols: React.FC = () => {
  const frame = useCurrentFrame();
  const sway = Math.sin(frame * 0.04) * 8;
  const pulse = Math.sin(frame * 0.05) * 0.1 + 1;

  // Orbiting sparkles
  const sparkles = [
    { distance: 750, speed: 0.5, offset: 0, size: 140 },
    { distance: 800, speed: -0.4, offset: 90, size: 130 },
    { distance: 770, speed: 0.45, offset: 180, size: 135 },
    { distance: 820, speed: -0.5, offset: 270, size: 145 },
  ];

  return (
    <>
      {/* Orbiting sparkles */}
      {sparkles.map((s, i) => {
        const angle = s.offset + frame * s.speed;
        const x = Math.cos((angle * Math.PI) / 180) * s.distance;
        const y = Math.sin((angle * Math.PI) / 180) * s.distance;
        const twinkle = Math.sin(frame * 0.08 + i) * 0.3 + 0.7;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: `translate(-50%, -50%) rotate(${frame * 1.2}deg) scale(${twinkle})`,
              fontSize: s.size,
              filter: "drop-shadow(0 0 35px rgba(100, 200, 255, 0.8))",
            }}
          >
            ✨
          </div>
        );
      })}

      {/* 😎 cool faces */}
      <div
        style={{
          position: "absolute",
          left: `${8 + sway * 0.3}%`,
          top: `${18 + Math.sin(frame * 0.035) * 6}%`,
          transform: `translate(-50%, -50%) rotate(${-8 + sway * 0.5}deg) scale(${0.9 + Math.sin(frame * 0.04) * 0.08})`,
          fontSize: 210,
          filter: "drop-shadow(0 0 45px rgba(100, 200, 255, 0.7))",
        }}
      >
        😎
      </div>
      <div
        style={{
          position: "absolute",
          left: `${92 - sway * 0.3}%`,
          top: `${18 + Math.sin(frame * 0.035 + 1) * 6}%`,
          transform: `translate(-50%, -50%) rotate(${8 - sway * 0.5}deg) scale(${0.9 + Math.sin(frame * 0.04 + 1) * 0.08})`,
          fontSize: 210,
          filter: "drop-shadow(0 0 45px rgba(100, 200, 255, 0.7))",
        }}
      >
        😎
      </div>
      <div
        style={{
          position: "absolute",
          left: `${10 + sway * 0.25}%`,
          top: `${82 - Math.sin(frame * 0.03) * 5}%`,
          transform: `translate(-50%, -50%) rotate(${-6 + sway * 0.4}deg) scale(${0.85 + Math.sin(frame * 0.045) * 0.08})`,
          fontSize: 180,
          filter: "drop-shadow(0 0 38px rgba(100, 200, 255, 0.6))",
        }}
      >
        😎
      </div>
      <div
        style={{
          position: "absolute",
          left: `${90 - sway * 0.25}%`,
          top: `${82 - Math.sin(frame * 0.03 + 1) * 5}%`,
          transform: `translate(-50%, -50%) rotate(${6 - sway * 0.4}deg) scale(${0.85 + Math.sin(frame * 0.045 + 1) * 0.08})`,
          fontSize: 180,
          filter: "drop-shadow(0 0 38px rgba(100, 200, 255, 0.6))",
        }}
      >
        😎
      </div>

      {/* 🆒 and 🔥 */}
      <div
        style={{
          position: "absolute",
          left: `${5 + sway * 0.2}%`,
          top: `${50 + Math.sin(frame * 0.04) * 8}%`,
          transform: `translate(-50%, -50%) scale(${pulse}) rotate(${sway * 0.6}deg)`,
          fontSize: 170,
          filter: "drop-shadow(0 0 40px rgba(0, 150, 255, 0.7))",
        }}
      >
        🆒
      </div>
      <div
        style={{
          position: "absolute",
          left: `${95 - sway * 0.2}%`,
          top: `${50 + Math.sin(frame * 0.04 + 1) * 8}%`,
          transform: `translate(-50%, -50%) scale(${pulse}) rotate(${-sway * 0.6}deg)`,
          fontSize: 170,
          filter: "drop-shadow(0 0 40px rgba(255, 100, 0, 0.7))",
        }}
      >
        🔥
      </div>

      {/* 👍 thumbs up */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: `${92 + Math.sin(frame * 0.05) * 4}%`,
          transform: `translate(-50%, -50%) scale(${0.85 + Math.sin(frame * 0.06) * 0.1})`,
          fontSize: 160,
          filter: "drop-shadow(0 0 35px rgba(255, 200, 0, 0.6))",
        }}
      >
        👍
      </div>
    </>
  );
};

// ============================================
// PARTICLE EFFECTS (BEHIND CHARACTER)
// ============================================

const SteamParticles: React.FC = () => {
  const frame = useCurrentFrame();
  const particles = [
    { x: -360, delay: 0 },
    { x: 360, delay: 15 },
    { x: -240, delay: 30 },
    { x: 240, delay: 45 },
    { x: 0, delay: 22 },
  ];

  return (
    <>
      {particles.map((p, i) => {
        const cycleLength = 45;
        const progress = ((frame + p.delay) % cycleLength) / cycleLength;
        const y = -500 - progress * 500;
        const opacity = Math.sin(progress * Math.PI) * 0.6;
        const scale = 0.5 + progress * 1;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${p.x}px)`,
              top: `calc(40% + ${y}px)`,
              width: 160 * scale,
              height: 160 * scale,
              borderRadius: "50%",
              background: "rgba(255, 100, 100, 0.5)",
              filter: `blur(${40 + progress * 50}px)`,
              opacity,
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
    </>
  );
};

const Sparkles: React.FC = () => {
  const frame = useCurrentFrame();
  const sparkles = Array.from({ length: 16 }).map((_, i) => ({
    angle: (360 / 16) * i,
    distance: 700 + Math.sin(i * 2) * 160,
    delay: i * 6,
    size: 44 + (i % 3) * 24,
  }));

  return (
    <>
      {sparkles.map((s, i) => {
        const angle = s.angle + frame * 1.2;
        const x = Math.cos((angle * Math.PI) / 180) * s.distance;
        const y = Math.sin((angle * Math.PI) / 180) * s.distance;
        const twinkle = Math.sin((frame + s.delay) * 0.2) * 0.5 + 0.5;
        const scale = 0.5 + twinkle * 0.5;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              width: s.size * scale,
              height: s.size * scale,
              transform: `translate(-50%, -50%) rotate(${frame * 3}deg)`,
              opacity: twinkle,
            }}
          >
            <svg viewBox="0 0 24 24" fill="gold">
              <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
            </svg>
          </div>
        );
      })}
    </>
  );
};

const Hearts: React.FC = () => {
  const frame = useCurrentFrame();
  const hearts = [
    { x: -500, delay: 0 },
    { x: 500, delay: 20 },
    { x: -360, delay: 40 },
    { x: 360, delay: 60 },
    { x: -640, delay: 30 },
    { x: 640, delay: 50 },
  ];

  return (
    <>
      {hearts.map((h, i) => {
        const cycleLength = 80;
        const progress = ((frame + h.delay) % cycleLength) / cycleLength;
        const y = 400 - progress * 1000;
        const opacity = Math.sin(progress * Math.PI) * 0.9;
        const scale = 0.5 + Math.sin(progress * Math.PI) * 0.5;
        const wobble = Math.sin((frame + h.delay) * 0.15) * 50;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${h.x + wobble}px)`,
              top: `calc(50% + ${y}px)`,
              fontSize: 90 * scale,
              opacity,
              transform: "translate(-50%, -50%)",
              color: "#ff6b8a",
              textShadow: "0 0 36px rgba(255, 107, 138, 0.7)",
            }}
          >
            ❤️
          </div>
        );
      })}
    </>
  );
};

const Teardrops: React.FC = () => {
  const frame = useCurrentFrame();
  const tears = [
    { x: -240, delay: 0 },
    { x: 240, delay: 25 },
    { x: -240, delay: 50 },
    { x: 240, delay: 75 },
  ];

  return (
    <>
      {tears.map((t, i) => {
        const cycleLength = 60;
        const progress = ((frame + t.delay) % cycleLength) / cycleLength;
        const y = -100 + progress * 800;
        const opacity = interpolate(progress, [0, 0.1, 0.8, 1], [0, 0.9, 0.9, 0]);
        const scale = 0.9 + progress * 0.5;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${t.x}px)`,
              top: `calc(40% + ${y}px)`,
              width: 44 * scale,
              height: 64 * scale,
              background: "linear-gradient(180deg, rgba(100, 180, 255, 0.9) 0%, rgba(80, 150, 255, 0.7) 100%)",
              borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
              opacity,
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 30px rgba(100, 180, 255, 0.6)",
            }}
          />
        );
      })}
    </>
  );
};

const LaughTears: React.FC = () => {
  const frame = useCurrentFrame();
  const tears = [
    { x: -130, dir: -1, delay: 0 },
    { x: 130, dir: 1, delay: 15 },
    { x: -130, dir: -1, delay: 30 },
    { x: 130, dir: 1, delay: 45 },
  ];

  return (
    <>
      {tears.map((t, i) => {
        const cycleLength = 50;
        const progress = ((frame + t.delay) % cycleLength) / cycleLength;
        const y = -80 + progress * 300;
        const xOffset = t.dir * progress * 100;
        const opacity = Math.sin(progress * Math.PI) * 0.8;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${t.x + xOffset}px)`,
              top: `calc(40% + ${y}px)`,
              width: 16,
              height: 24,
              background: "rgba(255, 220, 100, 0.9)",
              borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
              opacity,
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 10px rgba(255, 220, 100, 0.6)",
            }}
          />
        );
      })}
    </>
  );
};

// ============================================
// MASCOT ANIMATIONS (BIGGER!)
// ============================================

const AngryMascot: React.FC = () => {
  const frame = useCurrentFrame();

  const shakeX = Math.sin(frame * 1.5) * 15 + Math.cos(frame * 2.3) * 10;
  const shakeY = Math.cos(frame * 1.8) * 8;
  const pulse = 1 + Math.sin(frame * 0.3) * 0.08;
  const redIntensity = Math.sin(frame * 0.2) * 20;

  const size = BASE_SIZE * pulse;

  return (
    <Img
      src={staticFile("mascot-3d.png")}
      style={{
        position: "absolute",
        width: size,
        height: size,
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) translate(${shakeX}px, ${shakeY}px)`,
        filter: `hue-rotate(${-15 + redIntensity}deg) saturate(1.6) brightness(${1.1 + Math.sin(frame * 0.25) * 0.15})`,
      }}
    />
  );
};

const HappyMascot: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bounceRaw = spring({
    frame: frame % 40,
    fps,
    config: { damping: 6, stiffness: 120, mass: 0.8 },
  });
  const bounce = bounceRaw * 40;
  const tilt = Math.sin(frame * 0.08) * 12;
  const scalePop = 1 + Math.sin(frame * 0.12) * 0.08;

  const size = BASE_SIZE * scalePop;

  return (
    <Img
      src={staticFile("mascot-3d.png")}
      style={{
        position: "absolute",
        width: size,
        height: size,
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) translateY(${-bounce}px) rotate(${tilt}deg)`,
        filter: `hue-rotate(25deg) brightness(1.25) saturate(1.15)`,
      }}
    />
  );
};

const SadMascot: React.FC = () => {
  const frame = useCurrentFrame();

  const droop = Math.sin(frame * 0.04) * 15 + 35;
  const shrink = 0.92 + Math.sin(frame * 0.03) * 0.03;
  const tilt = -5 + Math.sin(frame * 0.02) * 2;

  const size = BASE_SIZE * shrink;

  return (
    <Img
      src={staticFile("mascot-3d.png")}
      style={{
        position: "absolute",
        width: size,
        height: size,
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) translateY(${droop}px) rotate(${tilt}deg)`,
        filter: `hue-rotate(180deg) saturate(0.5) brightness(0.7)`,
      }}
    />
  );
};

const LaughingMascot: React.FC = () => {
  const frame = useCurrentFrame();

  const bounce = Math.abs(Math.sin(frame * 0.2)) * 55;
  const shake = Math.sin(frame * 0.6) * 18;
  const squash = 1 + Math.sin(frame * 0.2) * 0.12;
  const stretch = 1 - Math.sin(frame * 0.2) * 0.08;
  const hue = Math.sin(frame * 0.1) * 20;
  const rotation = Math.sin(frame * 0.15) * 10;

  return (
    <Img
      src={staticFile("mascot-3d.png")}
      style={{
        position: "absolute",
        width: BASE_SIZE * stretch,
        height: BASE_SIZE * squash,
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) translateY(${-bounce}px) translateX(${shake}px) rotate(${rotation}deg)`,
        filter: `hue-rotate(${hue}deg) brightness(1.2) saturate(1.1)`,
      }}
    />
  );
};

// NEW MASCOT ANIMATIONS

const ThinkingMascot: React.FC = () => {
  const frame = useCurrentFrame();

  // Slow contemplative sway
  const tilt = Math.sin(frame * 0.03) * 8;
  const float = Math.sin(frame * 0.04) * 10;
  const scale = 1 + Math.sin(frame * 0.05) * 0.03;

  return (
    <Img
      src={staticFile("mascot-3d.png")}
      style={{
        position: "absolute",
        width: BASE_SIZE * scale,
        height: BASE_SIZE * scale,
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) translateY(${float}px) rotate(${tilt}deg)`,
        filter: `hue-rotate(260deg) brightness(0.95) saturate(0.9)`,
      }}
    />
  );
};

const SurprisedMascot: React.FC = () => {
  const frame = useCurrentFrame();

  // Quick jolt then settle
  const jolt = Math.sin(frame * 0.4) * 12 * Math.exp(-frame * 0.02);
  const jumpBack = Math.abs(Math.sin(frame * 0.25)) * 25;
  const scale = 1 + Math.abs(Math.sin(frame * 0.2)) * 0.1;

  return (
    <Img
      src={staticFile("mascot-3d.png")}
      style={{
        position: "absolute",
        width: BASE_SIZE * scale,
        height: BASE_SIZE * scale,
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) translateY(${-jumpBack}px) translateX(${jolt}px)`,
        filter: `hue-rotate(40deg) brightness(1.3) saturate(1.2)`,
      }}
    />
  );
};

const LoveMascot: React.FC = () => {
  const frame = useCurrentFrame();

  // Dreamy floating sway
  const float = Math.sin(frame * 0.05) * 15;
  const sway = Math.sin(frame * 0.04) * 6;
  const pulse = 1 + Math.sin(frame * 0.08) * 0.06;
  const tilt = Math.sin(frame * 0.03) * 5;

  return (
    <Img
      src={staticFile("mascot-3d.png")}
      style={{
        position: "absolute",
        width: BASE_SIZE * pulse,
        height: BASE_SIZE * pulse,
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) translateY(${float}px) translateX(${sway}px) rotate(${tilt}deg)`,
        filter: `hue-rotate(330deg) brightness(1.15) saturate(1.2)`,
      }}
    />
  );
};

const CoolMascot: React.FC = () => {
  const frame = useCurrentFrame();

  // Confident swagger
  const lean = Math.sin(frame * 0.04) * 6;
  const nod = Math.sin(frame * 0.05) * 4;
  const scale = 1 + Math.sin(frame * 0.06) * 0.04;

  return (
    <Img
      src={staticFile("mascot-3d.png")}
      style={{
        position: "absolute",
        width: BASE_SIZE * scale,
        height: BASE_SIZE * scale,
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) translateY(${nod}px) rotate(${lean}deg)`,
        filter: `hue-rotate(200deg) brightness(1.1) saturate(1.1) contrast(1.1)`,
      }}
    />
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const ClaudeReaction: React.FC<{ emotion: Emotion }> = ({ emotion }) => {
  const backgrounds: Record<Emotion, React.FC> = {
    angry: AngryBackground,
    happy: HappyBackground,
    sad: SadBackground,
    laughing: LaughingBackground,
    thinking: ThinkingBackground,
    surprised: SurprisedBackground,
    love: LoveBackground,
    cool: CoolBackground,
  };

  const mascots: Record<Emotion, React.FC> = {
    angry: AngryMascot,
    happy: HappyMascot,
    sad: SadMascot,
    laughing: LaughingMascot,
    thinking: ThinkingMascot,
    surprised: SurprisedMascot,
    love: LoveMascot,
    cool: CoolMascot,
  };

  const behindEffects: Record<Emotion, React.FC> = {
    angry: SteamParticles,
    happy: () => (
      <>
        <Sparkles />
        <Hearts />
      </>
    ),
    sad: Teardrops,
    laughing: LaughTears,
    thinking: () => null,
    surprised: () => null,
    love: Hearts,
    cool: Sparkles,
  };

  const aroundSymbols: Record<Emotion, React.FC> = {
    angry: AngrySymbols,
    happy: HappySymbols,
    sad: SadSymbols,
    laughing: LaughingSymbols,
    thinking: ThinkingSymbols,
    surprised: SurprisedSymbols,
    love: LoveSymbols,
    cool: CoolSymbols,
  };

  const Background = backgrounds[emotion];
  const BehindEffects = behindEffects[emotion];
  const Mascot = mascots[emotion];
  const AroundSymbols = aroundSymbols[emotion];

  return (
    <AbsoluteFill>
      <Background />
      <BehindEffects />
      <Mascot />
      <AroundSymbols />
    </AbsoluteFill>
  );
};

// Export individual emotion components
export const ClaudeAngry: React.FC = () => <ClaudeReaction emotion="angry" />;
export const ClaudeHappy: React.FC = () => <ClaudeReaction emotion="happy" />;
export const ClaudeSad: React.FC = () => <ClaudeReaction emotion="sad" />;
export const ClaudeLaughing: React.FC = () => <ClaudeReaction emotion="laughing" />;
export const ClaudeThinking: React.FC = () => <ClaudeReaction emotion="thinking" />;
export const ClaudeSurprised: React.FC = () => <ClaudeReaction emotion="surprised" />;
export const ClaudeLove: React.FC = () => <ClaudeReaction emotion="love" />;
export const ClaudeCool: React.FC = () => <ClaudeReaction emotion="cool" />;
