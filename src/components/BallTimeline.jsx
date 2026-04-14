export default function BallTimeline({ balls = [] }) {
  if (!balls.length) return null;

  // Group ALL balls to get correct absolute over numbers
  const allOvers = [];
  let currentOverBalls = [];
  let legalBallsInOver = 0;

  balls.forEach((ball) => {
    currentOverBalls.push(ball);
    if (!ball.isWide && !ball.isNoBall) {
      legalBallsInOver++;
    }
    
    if (legalBallsInOver === 6) {
      allOvers.push({
        number: allOvers.length + 1,
        balls: [...currentOverBalls],
        total: currentOverBalls.reduce((sum, b) => sum + (b.runs || 0), 0)
      });
      currentOverBalls = [];
      legalBallsInOver = 0;
    }
  });

  // Handle current ongoing over
  if (currentOverBalls.length > 0) {
    allOvers.push({
      number: allOvers.length + 1,
      balls: [...currentOverBalls],
      total: currentOverBalls.reduce((sum, b) => sum + (b.runs || 0), 0)
    });
  }

  // Only show the last 3 overs for the timeline
  const displayedOvers = allOvers.slice(-3);

  const getClass = (ball) => {
    if (ball.isWicket) return 'ball-w';
    if (ball.isWide) return 'ball-wd';
    if (ball.isNoBall) return 'ball-nb';
    if (ball.isBye) return 'ball-bye';
    if (ball.isLegBye) return 'ball-lb';
    if (ball.runs === 4) return 'ball-4';
    if (ball.runs === 6) return 'ball-6';
    return '';
  };

  const getLabel = (ball) => {
    if (ball.isWicket) return 'W';
    if (ball.isWide) return 'WD';
    if (ball.isNoBall) {
      const batRuns = ball.batsmanRuns || 0;
      return batRuns > 0 ? `NB${batRuns}` : 'NB';
    }
    if (ball.isBye) return `B${ball.runs}`;
    if (ball.isLegBye) return `LB${ball.runs}`;
    return ball.runs;
  };

  return (
    <div className="ball-timeline">
      {displayedOvers.map((over, oi) => (
        <div key={over.number} style={{ display: 'flex', alignItems: 'center' }}>
          {oi > 0 && <div className="ball-divider" />}
          <div className="ball-over-item">
            <span className="ball-over-label">Over {over.number}</span>
            <div className="ball-group">
              {over.balls.map((ball, bi) => (
                <span key={bi} className={`ball-chip ${getClass(ball)}`}>
                  {getLabel(ball)}
                </span>
              ))}
            </div>
            <span className="ball-over-total">= {over.total}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
