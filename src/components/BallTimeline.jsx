export default function BallTimeline({ balls = [] }) {
  if (!balls.length) return null;

  const getClass = (ball) => {
    if (ball.isWicket) return 'ball-w';
    if (ball.isWide) return 'ball-wd';
    if (ball.isNoBall) return 'ball-nb';
    if (ball.isBye) return 'ball-bye';
    if (ball.isLegBye) return 'ball-lb';
    if (ball.runs === 4) return 'ball-4';
    if (ball.runs === 6) return 'ball-6';
    return `ball-${Math.min(ball.runs, 3)}`;
  };

  const getLabel = (ball) => {
    if (ball.isWicket) return 'W';
    if (ball.isWide) return 'WD';
    if (ball.isNoBall) return 'NB';
    if (ball.isBye) return `B${ball.runs}`;
    if (ball.isLegBye) return `LB${ball.runs}`;
    return ball.runs;
  };

  return (
    <div className="ball-timeline">
      {balls.map((ball, i) => (
        <span key={i}>
          {ball.overSep && <span className="ball-over-sep">|</span>}
          <span className={`ball-chip ${getClass(ball)}`}>
            {getLabel(ball)}
          </span>
        </span>
      ))}
    </div>
  );
}
