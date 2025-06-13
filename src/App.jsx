import React, { useState, useEffect } from "react";

// --- Вспомогательные функции ---
function round4(value) { return Math.round(value * 10000) / 10000; }
function parseVector(str) { return str.trim().split(/\s+/).map(Number).map(round4).filter(v => !isNaN(v)); }
function powVector(arr, n) { return arr.map(x => round4(Math.pow(x, n))); }
function expectedValue(values, probs) { let result = 0; for (let i = 0; i < values.length; ++i) result += values[i] * probs[i]; return round4(result); }
function sumTable(X, Y) { return X.map(xi => Y.map(yj => round4(xi + yj))); }
function subTable(X, Y) { return X.map(xi => Y.map(yj => round4(xi - yj))); }
function mulTable(X, Y) { return X.map(xi => Y.map(yj => round4(xi * yj))); }
function probTable(PX, PY) { return PX.map(pxi => PY.map(pyj => round4(pxi * pyj))); }
function createSortedDistribution(values, probs) {
  let result = [];
  for (let i = 0; i < values.length; ++i)
    for (let j = 0; j < values[0].length; ++j)
      result.push({ value: values[i][j], probability: probs[i][j] });
  result.sort((a, b) => a.value - b.value);
  return result;
}
function calcStats(values, probs, power = 1, name = "X") {
  let alpha = Array(6).fill(0);
  for (let k = 1; k <= 5; ++k) alpha[k] = expectedValue(powVector(values, k), probs);
  let mu = Array(6).fill(0);
  let m1 = alpha[1];
  mu[2] = alpha[2] - Math.pow(m1, 2);
  mu[3] = alpha[3] - 3 * m1 * alpha[2] + 2 * Math.pow(m1, 3);
  mu[4] = alpha[4] - 4 * m1 * alpha[3] + 6 * Math.pow(m1, 2) * alpha[2] - 3 * Math.pow(m1, 4);
  mu[5] = alpha[5] - 5 * m1 * alpha[4] + 10 * Math.pow(m1, 2) * alpha[3] - 10 * Math.pow(m1, 3) * alpha[2] + 4 * Math.pow(m1, 5);
  const sigma = Math.sqrt(mu[2]);
  const A = sigma !== 0 ? mu[3] / Math.pow(sigma, 3) : 0;
  const E = sigma !== 0 ? mu[4] / Math.pow(sigma, 4) - 3 : 0;
  return { alpha, mu, sigma: round4(sigma), A: round4(A), E: round4(E) };
}

// --- Компоненты ---
function Table({ data, title }) {
  if (!data.length) return null;
  return (
    <div style={{ margin: "1em 0" }}>
      <b>{title}</b>
      <table border="1" cellPadding={4} style={{ marginTop: 4 }}>
        <thead>
          <tr>
            <th></th>
            {data[0].map((_, j) => <th key={j}>Y[{j + 1}]</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>X[{i + 1}]</td>
              {row.map((v, j) => <td key={j}>{v.toFixed(4)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function SortedDistribution({ dist, title }) {
  if (!dist.length) return null;
  return (
    <div style={{ margin: "1em 0" }}>
      <b>{title} (отсортировано)</b>
      <table border="1" cellPadding={4} style={{ marginTop: 4 }}>
        <thead>
          <tr>
            <th>Значение</th>
            <th>Вероятность</th>
          </tr>
        </thead>
        <tbody>
          {dist.map((pair, i) => (
            <tr key={i}>
              <td>{pair.value.toFixed(4)}</td>
              <td>{pair.probability.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Stats({ stats, name }) {
  if (!stats) return null;
  return (
    <div style={{ margin: "1em 0" }}>
      <b>Статистические характеристики для {name}</b>
      <div>Математическое ожидание: M({name}) = {stats.alpha[1].toFixed(4)}</div>
      <div>Дисперсия: D({name}) = {stats.mu[2].toFixed(4)}</div>
      <div>СКО: {stats.sigma.toFixed(4)}</div>
      <div>Начальные моменты:</div>
      <ul>
        {[1,2,3,4,5].map(k => <li key={k}>a{k} = M({name}^{k}) = {stats.alpha[k].toFixed(4)}</li>)}
      </ul>
      <div>Центральные моменты:</div>
      <ul>
        {[2,3,4,5].map(k => <li key={k}>m{k} = {stats.mu[k].toFixed(4)}</li>)}
      </ul>
      <div>Асимметрия: A = {stats.A.toFixed(4)}</div>
      <div>Эксцесс: E = {stats.E.toFixed(4)}</div>
    </div>
  );
}

// --- Диалоги ---
function getThemeColors() {
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return isDark
    ? {
        bg: "#23282d", text: "#f3f3f3", title: "#f3f3f3", label: "#e0e0e0",
        inputBg: "#181c1f", inputText: "#f3f3f3", inputBorder: "#555",
        buttonBg: "#23282d", buttonText: "#f3f3f3", buttonBorder: "#555"
      }
    : {
        bg: "#fff", text: "#111", title: "#111", label: "#333",
        inputBg: "#fff", inputText: "#111", inputBorder: "#888",
        buttonBg: "#fff", buttonText: "#111", buttonBorder: "#888"
      };
}
function ConstantDialog({ open, onClose, X, Y, PX, PY }) {
  const [constX, setConstX] = useState(1);
  const [constY, setConstY] = useState(1);
  const [result, setResult] = useState(null);
  const theme = getThemeColors();
  function handleCalc() {
    const Xs = X.map(v => round4(v * constX));
    const Ys = Y.map(v => round4(v * constY));
    const sumT = sumTable(Xs, Ys);
    const subT = subTable(Xs, Ys);
    const mulT = mulTable(Xs, Ys);
    const probT = probTable(PX, PY);
    setResult({
      Xs, Ys, sumT, subT, mulT, probT,
      sortedSum: createSortedDistribution(sumT, probT),
      sortedSub: createSortedDistribution(subT, probT),
      sortedMul: createSortedDistribution(mulT, probT),
      statsX: calcStats(Xs, PX, 1, "X*C"),
      statsY: calcStats(Ys, PY, 1, "Y*C"),
    });
  }
  return (
    <div style={{
      position: "fixed", left: 0, top: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.3)", zIndex: 1000, display: "flex",
      alignItems: "center", justifyContent: "center",
      opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
      transition: "opacity 0.2s ease",
    }}>
      <div style={{
        background: theme.bg, color: theme.text,
        padding: 20, borderRadius: 8, width: 600,
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <h3 style={{color: theme.title}}>Расчеты с константой</h3>
        <div>
          <label style={{color: theme.label}}>Константа для X: <input
            type="number" value={constX} onChange={e => setConstX(Number(e.target.value))}
            style={{
              background: theme.inputBg, color: theme.inputText,
              border: `1px solid ${theme.inputBorder}`,
              borderRadius: 4, padding: "6px 12px"
            }}
          /></label>
          <label style={{color: theme.label, marginLeft: 20}}>Константа для Y: <input
            type="number" value={constY} onChange={e => setConstY(Number(e.target.value))}
            style={{
              background: theme.inputBg, color: theme.inputText,
              border: `1px solid ${theme.inputBorder}`,
              borderRadius: 4, padding: "6px 12px"
            }}
          /></label>
          <button onClick={handleCalc} style={{
            background: theme.buttonBg, color: theme.buttonText,
            border: `1px solid ${theme.buttonBorder}`,
            padding: "6px 16px", borderRadius: 8, marginLeft: 20, cursor: "pointer",
          }}>Рассчитать</button>
          <button onClick={onClose} style={{
            background: theme.buttonBg, color: theme.buttonText,
            border: `1px solid ${theme.buttonBorder}`,
            padding: "6px 16px", borderRadius: 8, marginLeft: 20, cursor: "pointer",
          }}>Закрыть</button>
        </div>
        {result && (
          <div>
            <div style={{margin: "1em 0"}}>X * C: {result.Xs.join(", ")}</div>
            <div>Y * C: {result.Ys.join(", ")}</div>
            <Table data={result.sumT} title="Сумма (X*C + Y*C)" />
            <SortedDistribution dist={result.sortedSum} title="Сумма (X*C + Y*C)" />
            <Table data={result.subT} title="Разность (X*C - Y*C)" />
            <SortedDistribution dist={result.sortedSub} title="Разность (X*C - Y*C)" />
            <Table data={result.mulT} title="Произведение (X*C * Y*C)" />
            <SortedDistribution dist={result.sortedMul} title="Произведение (X*C * Y*C)" />
            <Table data={result.probT} title="Вероятности (P_X*P_Y)" />
            <Stats stats={result.statsX} name="X*C" />
            <Stats stats={result.statsY} name="Y*C" />
          </div>
        )}
      </div>
    </div>
  );
}
function PowerDialog({ open, onClose, X, Y, PX, PY }) {
  const [power, setPower] = useState(2);
  const [result, setResult] = useState(null);
  const theme = getThemeColors();
  function handleCalc() {
    if (!Number.isFinite(power) || power === 0) {
      alert("Степень должна быть не равна 0 и быть числом!");
      return;
    }
    const Xp = powVector(X, power);
    const Yp = powVector(Y, power);
    const sumT = sumTable(Xp, Yp);
    const subT = subTable(Xp, Yp);
    const mulT = mulTable(Xp, Yp);
    const probT = probTable(PX, PY);
    setResult({
      Xp, Yp, sumT, subT, mulT, probT,
      sortedSum: createSortedDistribution(sumT, probT),
      sortedSub: createSortedDistribution(subT, probT),
      sortedMul: createSortedDistribution(mulT, probT),
      statsX: calcStats(X, PX, power, "X"),
      statsY: calcStats(Y, PY, power, "Y"),
    });
  }
  return (
    <div style={{
      position: "fixed", left: 0, top: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.3)", zIndex: 1000, display: "flex",
      alignItems: "center", justifyContent: "center",
      opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
      transition: "opacity 0.2s ease",
    }}>
      <div style={{
        background: theme.bg, color: theme.text,
        padding: 20, borderRadius: 8, width: 600,
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <h3 style={{color: theme.title}}>Возведение в степень</h3>
        <div>
          <label style={{color: theme.label}}>
            Степень: <input
              type="number" value={power} onChange={e => setPower(Number(e.target.value))}
              style={{
                background: theme.inputBg, color: theme.inputText,
                border: `1px solid ${theme.inputBorder}`,
                borderRadius: 4, padding: "6px 12px"
              }}
            />
          </label>
          <button onClick={handleCalc} style={{
            background: theme.buttonBg, color: theme.buttonText,
            border: `1px solid ${theme.buttonBorder}`,
            padding: "6px 16px", borderRadius: 8, marginLeft: 20, cursor: "pointer",
          }}>Рассчитать</button>
          <button onClick={onClose} style={{
            background: theme.buttonBg, color: theme.buttonText,
            border: `1px solid ${theme.buttonBorder}`,
            padding: "6px 16px", borderRadius: 8, marginLeft: 20, cursor: "pointer",
          }}>Закрыть</button>
        </div>
        {result && (
          <div>
            <div style={{margin: "1em 0"}}>X^{power}: {result.Xp.join(", ")}</div>
            <div>Y^{power}: {result.Yp.join(", ")}</div>
            <Table data={result.sumT} title={`Сумма (X^${power} + Y^${power})`} />
            <SortedDistribution dist={result.sortedSum} title={`Сумма (X^${power} + Y^${power})`} />
            <Table data={result.subT} title={`Разность (X^${power} - Y^${power})`} />
            <SortedDistribution dist={result.sortedSub} title={`Разность (X^${power} - Y^${power})`} />
            <Table data={result.mulT} title={`Произведение (X^${power} * Y^${power})`} />
            <SortedDistribution dist={result.sortedMul} title={`Произведение (X^${power} * Y^${power})`} />
            <Table data={result.probT} title="Вероятности (P_X*P_Y)" />
            <Stats stats={result.statsX} name={`X (степень ${power})`} />
            <Stats stats={result.statsY} name={`Y (степень ${power})`} />
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [sizeX, setSizeX] = useState(3);
  const [sizeY, setSizeY] = useState(3);
  const [Xstr, setXstr] = useState("");
  const [Ystr, setYstr] = useState("");
  const [PXstr, setPXstr] = useState("");
  const [PYstr, setPYstr] = useState("");
  const [result, setResult] = useState(null);
  const [showConst, setShowConst] = useState(false);
  const [showPower, setShowPower] = useState(false);
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('calcHistory');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 700);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  const [isHistoryVisible, setIsHistoryVisible] = useState(true);
  const [errors, setErrors] = useState({ X: "", Y: "", PX: "", PY: "" });

  useEffect(() => {
    localStorage.setItem('calcHistory', JSON.stringify(history));
  }, [history]);

  function validateInputs() {
    const newErrors = { X: "", Y: "", PX: "", PY: "" };
    const X = parseVector(Xstr);
    const Y = parseVector(Ystr);
    const PX = parseVector(PXstr);
    const PY = parseVector(PYstr);
    if (X.length !== sizeX) newErrors.X = `Введите ${sizeX} значений через пробел`;
    if (Y.length !== sizeY) newErrors.Y = `Введите ${sizeY} значений через пробел`;
    if (PX.length !== sizeX) newErrors.PX = `Введите ${sizeX} значений через пробел`;
    if (PY.length !== sizeY) newErrors.PY = `Введите ${sizeY} значений через пробел`;
    const sumPX = PX.length === sizeX ? PX.reduce((a, b) => a + b, 0) : 0;
    const sumPY = PY.length === sizeY ? PY.reduce((a, b) => a + b, 0) : 0;
    if (PX.length === sizeX && Math.abs(sumPX - 1) > 1e-4) newErrors.PX = "Сумма вероятностей должна быть равна 1";
    if (PY.length === sizeY && Math.abs(sumPY - 1) > 1e-4) newErrors.PY = "Сумма вероятностей должна быть равна 1";
    setErrors(newErrors);
    return Object.values(newErrors).every(e => !e);
  }

  function handleCalculate() {
    if (!validateInputs()) return;
    const X = parseVector(Xstr);
    const Y = parseVector(Ystr);
    const PX = parseVector(PXstr);
    const PY = parseVector(PYstr);
    const sumT = sumTable(X, Y);
    const subT = subTable(X, Y);
    const mulT = mulTable(X, Y);
    const probT = probTable(PX, PY);
    const newResult = {
      X, Y, PX, PY,
      sumT, subT, mulT, probT,
      sortedSum: createSortedDistribution(sumT, probT),
      sortedSub: createSortedDistribution(subT, probT),
      sortedMul: createSortedDistribution(mulT, probT),
      statsX: calcStats(X, PX, 2, "X"),
      statsY: calcStats(Y, PY, 2, "Y"),
    };
    setResult(newResult);
    setHistory(prev => {
      const arr = [newResult, ...prev];
      return arr.slice(0, 3);
    });
  }

  function handleClear() {
    setXstr("");
    setYstr("");
    setPXstr("");
    setPYstr("");
    setResult(null);
    setErrors({ X: "", Y: "", PX: "", PY: "" });
  }

  const X = parseVector(Xstr);
  const Y = parseVector(Ystr);
  const PX = parseVector(PXstr);
  const PY = parseVector(PYstr);

  // --- Стили истории ---
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const historyBoxStyle = isMobile
    ? {
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2000,
        background: isDark ? "rgba(35,40,45,0.98)" : "rgba(255,255,255,0.97)",
        color: isDark ? "#f3f3f3" : "#111",
        borderTop: "1px solid #888",
        borderRadius: "12px 12px 0 0",
        padding: "10px 8px 8px 8px",
        boxShadow: "0 -2px 16px rgba(0,0,0,0.12)",
        maxHeight: "40vh",
        overflowY: "auto",
        transform: isHistoryVisible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s ease, opacity 0.3s ease",
        pointerEvents: isHistoryVisible ? "auto" : "none",
        opacity: isHistoryVisible ? 1 : 0,
      }
    : {
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 2000,
        background: isDark ? "rgba(35,40,45,0.98)" : "rgba(255,255,255,0.97)",
        color: isDark ? "#f3f3f3" : "#111",
        border: "1px solid #888",
        borderRadius: 8,
        padding: "12px 16px",
        minWidth: 220,
        boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
        maxWidth: "40vw",
        // На десктопе — никаких ограничений по высоте и прокрутке!
        transform: isHistoryVisible ? "translateX(0)" : "translateX(120%)",
        transition: "transform 0.3s ease, opacity 0.3s ease",
        pointerEvents: isHistoryVisible ? "auto" : "none",
        opacity: isHistoryVisible ? 1 : 0,
      };

  const historyBtnStyle = {
    textAlign: "left",
    padding: "8px 16px",
    borderRadius: 4,
    border: "1px solid #aaa",
    background: isDark ? "#23282d" : "#f7f7f7",
    color: isDark ? "#f3f3f3" : "#222",
    fontSize: "0.95em",
    cursor: "pointer",
    margin: "0 0 6px 0",
    boxSizing: "border-box",
    width: "100%",
  };
  const historyClearBtnStyle = {
    background: "#e57373",
    color: "#fff",
    border: "1px solid #c62828",
    borderRadius: 4,
    padding: "8px 0",
    marginTop: 8,
    width: "100%",
    fontSize: "1em",
    cursor: "pointer",
  };

  // --- Кнопка открытия истории: в правом верхнем углу на ПК, внизу справа на мобильном ---
  const historyOpenBtnStyle = isMobile
    ? {
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 2100,
        padding: "8px 16px",
        borderRadius: 8,
        border: "1.5px solid var(--button-border)",
        background: "var(--button-bg)",
        color: "var(--button-text)",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      }
    : {
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 2100,
        padding: "8px 16px",
        borderRadius: 8,
        border: "1.5px solid var(--button-border)",
        background: "var(--button-bg)",
        color: "var(--button-text)",
        cursor: "pointer",
        boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
      };

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h2>Решалка распределений</h2>
      <div>
        <label>
          Количество элементов X: <input
            type="number"
            value={sizeX}
            min={1}
            onChange={e => setSizeX(Number(e.target.value))}
            style={{ width: 60 }}
          />
        </label>
      </div>
      <div>
        <label>
          Количество элементов Y: <input
            type="number"
            value={sizeY}
            min={1}
            onChange={e => setSizeY(Number(e.target.value))}
            style={{ width: 60 }}
          />
        </label>
      </div>
      <div>
        <label>
          X (через пробел): <input
            value={Xstr}
            onChange={e => setXstr(e.target.value)}
            placeholder="1 2 3"
            style={{
              width: 300,
              border: errors.X ? "1px solid #e57373" : "1px solid #888"
            }}
            title="Введите значения через пробел, например: 1 2 3"
          />
        </label>
        {errors.X && <div style={{ color: "#e57373", fontSize: "0.8em", marginTop: 4 }}>{errors.X}</div>}
      </div>
      <div>
        <label>
          Y (через пробел): <input
            value={Ystr}
            onChange={e => setYstr(e.target.value)}
            placeholder="1 2 3"
            style={{
              width: 300,
              border: errors.Y ? "1px solid #e57373" : "1px solid #888"
            }}
            title="Введите значения через пробел, например: 1 2 3"
          />
        </label>
        {errors.Y && <div style={{ color: "#e57373", fontSize: "0.8em", marginTop: 4 }}>{errors.Y}</div>}
      </div>
      <div>
        <label>
          P_X (через пробел): <input
            value={PXstr}
            onChange={e => setPXstr(e.target.value)}
            placeholder="0.1 0.2 0.7"
            style={{
              width: 300,
              border: errors.PX ? "1px solid #e57373" : "1px solid #888"
            }}
            title="Введите вероятности через пробел, сумма должна быть равна 1"
          />
        </label>
        {errors.PX && <div style={{ color: "#e57373", fontSize: "0.8em", marginTop: 4 }}>{errors.PX}</div>}
      </div>
      <div>
        <label>
          P_Y (через пробел): <input
            value={PYstr}
            onChange={e => setPYstr(e.target.value)}
            placeholder="0.1 0.2 0.7"
            style={{
              width: 300,
              border: errors.PY ? "1px solid #e57373" : "1px solid #888"
            }}
            title="Введите вероятности через пробел, сумма должна быть равна 1"
          />
        </label>
        {errors.PY && <div style={{ color: "#e57373", fontSize: "0.8em", marginTop: 4 }}>{errors.PY}</div>}
      </div>
      <div className="button-row">
        <button onClick={handleCalculate}>Рассчитать распределения</button>
        <button onClick={() => setShowPower(true)}>Степень</button>
        <button onClick={() => setShowConst(true)}>Расчеты с C</button>
        <button onClick={handleClear}>Сбросить всё</button>
      </div>

      {/* --- Кнопка открытия истории --- */}
      {history.length > 0 && !isHistoryVisible && (
        <button
          style={historyOpenBtnStyle}
          onClick={() => setIsHistoryVisible(true)}
        >
          История
        </button>
      )}

      {/* --- История --- */}
      {history.length > 0 && (
        <div style={historyBoxStyle}>
          <b style={{ display: "block", marginBottom: 6, textAlign: "center", color: "var(--accent-color)" }}>
            История расчётов
            <button
              onClick={() => setIsHistoryVisible(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: isDark ? "#f3f3f3" : "#111",
                fontSize: "1em",
                padding: "0 8px"
              }}
            >
              Скрыть
            </button>
          </b>
          {isHistoryVisible && (
            <div>
              {history.map((h, i) => (
                <button
                  key={i}
                  style={historyBtnStyle}
                  onClick={() => setResult(h)}
                >
                  X: [{h.X.join(", ")}]<br/>Y: [{h.Y.join(", ")}]
                </button>
              ))}
              <button
                style={historyClearBtnStyle}
                onClick={() => setHistory([])}
              >
                Очистить историю
              </button>
            </div>
          )}
        </div>
      )}

      {result && (
        <div>
          <Table data={result.sumT} title="Сумма (X+Y)" />
          <SortedDistribution dist={result.sortedSum} title="Сумма (X+Y)" />
          <Table data={result.subT} title="Разность (X-Y)" />
          <SortedDistribution dist={result.sortedSub} title="Разность (X-Y)" />
          <Table data={result.mulT} title="Произведение (X*Y)" />
          <SortedDistribution dist={result.sortedMul} title="Произведение (X*Y)" />
          <Table data={result.probT} title="Вероятности (P_X*P_Y)" />
          <Stats stats={result.statsX} name="X" />
          <Stats stats={result.statsY} name="Y" />
        </div>
      )}
      <ConstantDialog open={showConst} onClose={() => setShowConst(false)} X={X} Y={Y} PX={PX} PY={PY} />
      <PowerDialog open={showPower} onClose={() => setShowPower(false)} X={X} Y={Y} PX={PX} PY={PY} />
      <div style={{marginTop: 40, color: "#888"}}>Программа разработана Школьником Е.С. и Хайнак Г.Р.</div>
    </div>
  );
}

export default App;
