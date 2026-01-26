import {
  AbsoluteFill,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

const Terminal: React.FC<{ children: React.ReactNode; width?: number }> = ({
  children,
  width = 1000,
}) => {
  return (
    <div
      style={{
        backgroundColor: "#1a1a2e",
        borderRadius: 16,
        padding: 32,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        width,
      }}
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            backgroundColor: "#ff5f56",
          }}
        />
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            backgroundColor: "#ffbd2e",
          }}
        />
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            backgroundColor: "#27ca3f",
          }}
        />
      </div>
      {children}
    </div>
  );
};

const TypedText: React.FC<{
  text: string;
  startFrame: number;
  typingSpeed?: number;
}> = ({ text, startFrame, typingSpeed = 2 }) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  if (relativeFrame < 0) return null;

  const charsToShow = Math.min(
    Math.floor(relativeFrame / typingSpeed),
    text.length
  );
  const displayText = text.slice(0, charsToShow);
  const showCursor = relativeFrame % 30 < 15 || charsToShow < text.length;

  return (
    <span style={{ fontFamily: "Monaco, monospace", fontSize: 32 }}>
      <span style={{ color: "#27ca3f" }}>$ </span>
      <span style={{ color: "#e0e0e0" }}>{displayText}</span>
      {showCursor && (
        <span
          style={{
            backgroundColor: "#e0e0e0",
            width: 12,
            height: 32,
            display: "inline-block",
            marginLeft: 2,
          }}
        />
      )}
    </span>
  );
};

const StepLabel: React.FC<{
  step: number;
  title: string;
}> = ({ step, title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        marginBottom: 40,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          backgroundColor: "#d97706",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          fontWeight: "bold",
          color: "white",
          fontFamily: "system-ui",
        }}
      >
        {step}
      </div>
      <span
        style={{
          fontSize: 42,
          fontWeight: 600,
          color: "white",
          fontFamily: "system-ui",
        }}
      >
        {title}
      </span>
    </div>
  );
};

const Step1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const terminalY = spring({
    frame: frame - 15,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const terminalTransform = interpolate(terminalY, [0, 1], [50, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f0f1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <StepLabel step={1} title="Install Claude Code" />
      <div style={{ transform: `translateY(${terminalTransform}px)`, opacity: terminalY }}>
        <Terminal>
          <TypedText
            text="npm install -g @anthropic-ai/claude-code"
            startFrame={30}
            typingSpeed={1.5}
          />
        </Terminal>
      </div>
    </AbsoluteFill>
  );
};

const Step2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const terminalY = spring({
    frame: frame - 15,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const terminalTransform = interpolate(terminalY, [0, 1], [50, 0]);

  const welcomeOpacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const promptOpacity = interpolate(frame, [100, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const responseOpacity = interpolate(frame, [140, 160], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0f0f1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <StepLabel step={2} title="Start Chatting" />
      <div style={{ transform: `translateY(${terminalTransform}px)`, opacity: terminalY }}>
        <Terminal width={1100}>
          {/* Command line */}
          <div>
            <TypedText text="claude" startFrame={30} typingSpeed={3} />
          </div>

          {/* Claude Code welcome with logo */}
          <div
            style={{
              marginTop: 28,
              opacity: welcomeOpacity,
              display: "flex",
              alignItems: "center",
              gap: 24,
            }}
          >
            {/* Claude mascot logo */}
            <Img
              src={staticFile("claude-logo.png")}
              style={{
                width: 80,
                height: 80,
                imageRendering: "pixelated",
              }}
            />
            {/* Welcome text */}
            <div
              style={{
                fontFamily: "Monaco, monospace",
                fontSize: 28,
                color: "#f97316",
                fontWeight: "bold",
              }}
            >
              Welcome to Claude Code!
            </div>
          </div>

          {/* Working directory */}
          <div
            style={{
              marginTop: 16,
              opacity: welcomeOpacity,
              fontFamily: "Monaco, monospace",
              fontSize: 20,
              color: "#6b7280",
            }}
          >
            <span style={{ color: "#9ca3af" }}>cwd:</span>{" "}
            <span style={{ color: "#60a5fa" }}>~/my-project</span>
          </div>

          {/* User prompt */}
          <div
            style={{
              marginTop: 20,
              opacity: promptOpacity,
              fontFamily: "Monaco, monospace",
              fontSize: 24,
              display: "flex",
              alignItems: "center",
            }}
          >
            <span style={{ color: "#d97706", fontWeight: "bold" }}>&gt;</span>
            <span style={{ color: "#e0e0e0", marginLeft: 12 }}>Hi Claude!</span>
          </div>

          {/* Claude response */}
          <div
            style={{
              marginTop: 20,
              opacity: responseOpacity,
              fontFamily: "Monaco, monospace",
              fontSize: 24,
              color: "#e0e0e0",
              lineHeight: 1.5,
            }}
          >
            Hello! I'm ready to help you with your project. What would you
            <br />
            like to work on today?
          </div>
        </Terminal>
      </div>
    </AbsoluteFill>
  );
};

export const ClaudeCodeInstall: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f0f1a" }}>
      {/* Step 1: Install (0-225 frames = 7.5 seconds) */}
      <Sequence from={0} durationInFrames={225}>
        <Step1 />
      </Sequence>

      {/* Step 2: Start Chatting (225-450 frames = 7.5 seconds) */}
      <Sequence from={225} durationInFrames={225}>
        <Step2 />
      </Sequence>
    </AbsoluteFill>
  );
};
