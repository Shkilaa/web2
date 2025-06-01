import React, { useState } from "react";
import "./style.css";

// --- Математические функции ---
function round4(value) {
    return Math.round(value * 10000) / 10000;
}

function parseVector(str) {
    return str
        .trim()
        .split(/\s+/)
        .map(Number)
        .map(round4)
        .filter((v) => !isNaN(v));
}

function powVector(arr, n) {
    return arr.map((x) => round4(Math.pow(x, n)));
}

function expectedValue(values, probs) {
    let result = 0;
    for (let i = 0; i < values.length; ++i) result += values[i] * probs[i];
    return round4(result);
}

function sumTable(X, Y) {
    return X.map((xi) => Y.map((yj) => round4(xi + yj)));
}

function subTable(X, Y) {
    return X.map((xi) => Y.map((yj) => round4(xi - yj)));
}

function mulTable(X, Y) {
    return X.map((xi) => Y.map((yj) => round4(xi * yj)));
}

function probTable(PX, PY) {
    return PX.map((pxi) => PY.map((pyj) => round4(pxi * pyj)));
}

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
    mu[5] =
        alpha[5] -
        5 * m1 * alpha[4] +
        10 * Math.pow(m1, 2) * alpha[3] -
        10 * Math.pow(m1, 3) * alpha[2] +
        4 * Math.pow(m1, 5);

    const sigma = Math.sqrt(mu[2]);
    const A = sigma !== 0 ? mu[3] / Math.pow(sigma, 3) : 0;
    const E = sigma !== 0 ? mu[4] / Math.pow(sigma, 4) - 3 : 0;

    return {
        alpha,
        mu,
        sigma: round4(sigma),
        A: round4(A),
        E: round4(E),
    };
}

// --- Компоненты для вывода таблиц и распределений ---
function Table({ data, title }) {
    if (!data.length) return null;
    return (
        <div style={{ margin: "1em 0" }}>
            <b>{title}</b>
            <table>
                <thead>
                    <tr>
                        <th></th>
                        {data[0].map((_, j) => (
                            <th key={j}>Y[{j + 1}]</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i}>
                            <td>X[{i + 1}]</td>
                            {row.map((v, j) => (
                                <td key={j}>{v.toFixed(4)}</td>
                            ))}
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
            <table>
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
                {[1, 2, 3, 4, 5].map(k => (
                    <li key={k}>a{k} = M({name}^{k}) = {stats.alpha[k].toFixed(4)}</li>
                ))}
            </ul>
            <div>Центральные моменты:</div>
            <ul>
                {[2, 3, 4, 5].map(k => (
                    <li key={k}>m{k} = {stats.mu[k].toFixed(4)}</li>
                ))}
            </ul>
            <div>Асимметрия: A = {stats.A.toFixed(4)}</div>
            <div>Эксцесс: E = {stats.E.toFixed(4)}</div>
        </div>
    );
}

// --- Диалоги для константы и степени ---
function ConstantDialog({ open, onClose, X, Y, PX, PY }) {
    const [constX, setConstX] = useState(1);
    const [constY, setConstY] = useState(1);
    const [result, setResult] = useState(null);

    if (!open) return null;

    function handleCalc() {
        const Xs = X.map((v) => round4(v * constX));
        const Ys = Y.map((v) => round4(v * constY));
        const sumT = sumTable(Xs, Ys);
        const subT = subTable(Xs, Ys);
        const mulT = mulTable(Xs, Ys);
        const probT = probTable(PX, PY);

        setResult({
            Xs, Ys,
            sumT, subT, mulT, probT,
            sortedSum: createSortedDistribution(sumT, probT),
            sortedSub: createSortedDistribution(subT, probT),
            sortedMul: createSortedDistribution(mulT, probT),
            statsX: calcStats(Xs, PX, 1, "X*C"),
            statsY: calcStats(Ys, PY, 1, "Y*C"),
        });
    }

    return (
        <div className="dialog-backdrop">
            <div className="dialog">
                <h3>Расчеты с константой</h3>
                <div>
                    <label>Константа для X: <input type="number" value={constX} onChange={e => setConstX(Number(e.target.value))} /></label>
                    <label style={{ marginLeft: 20 }}>Константа для Y: <input type="number" value={constY} onChange={e => setConstY(Number(e.target.value))} /></label>
                    <button onClick={handleCalc} style={{ marginLeft: 20 }}>Рассчитать</button>
                    <button onClick={onClose} style={{ marginLeft: 20 }}>Закрыть</button>
                </div>
                {result && (
                    <div>
                        <div style={{ margin: "1em 0" }}>X * C: {result.Xs.join(", ")}</div>
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

    if (!open) return null;

    function handleCalc() {
        if (power < 2 || power > 5) {
            alert("Степень должна быть от 2 до 5!");
            return;
        }
        const Xp = powVector(X, power);
        const Yp = powVector(Y, power);
        const sumT = sumTable(Xp, Yp);
        const subT = subTable(Xp, Yp);
        const mulT = mulTable(Xp, Yp);
        const probT = probTable(PX, PY);

        setResult({
            Xp, Yp,
            sumT, subT, mulT, probT,
            sortedSum: createSortedDistribution(sumT, probT),
            sortedSub: createSortedDistribution(subT, probT),
            sortedMul: createSortedDistribution(mulT, probT),
            statsX: calcStats(X, PX, power, "X"),
            statsY: calcStats(Y, PY, power, "Y"),
        });
    }

    return (
        <div className="dialog-backdrop">
            <div className="dialog">
                <h3>Возведение в степень</h3>
                <div>
                    <label>Степень (2-5): <input type="number" value={power} onChange={e => setPower(Number(e.target.value))} /></label>
                    <button onClick={handleCalc} style={{ marginLeft: 20 }}>Рассчитать</button>
                    <button onClick={onClose} style={{ marginLeft: 20 }}>Закрыть</button>
                </div>
                {result && (
                    <div>
                        <div style={{ margin: "1em 0" }}>X^{power}: {result.Xp.join(", ")}</div>
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

// --- Основное приложение ---
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

    function handleCalculate() {
        const X = parseVector(Xstr);
        const Y = parseVector(Ystr);
        const PX = parseVector(PXstr);
        const PY = parseVector(PYstr);

        if (
            X.length !== sizeX ||
            PX.length !== sizeX ||
            Y.length !== sizeY ||
            PY.length !== sizeY
        ) {
            alert("Количество элементов в массивах должно соответствовать выбранным размерам!");
            return;
        }
        const sumPX = PX.reduce((a, b) => a + b, 0);
        const sumPY = PY.reduce((a, b) => a + b, 0);
        if (Math.abs(sumPX - 1) > 1e-4 || Math.abs(sumPY - 1) > 1e-4) {
            alert(`Ошибка: сумма вероятностей должна быть равна 1!\nP_X = ${sumPX.toFixed(4)}, P_Y = ${sumPY.toFixed(4)}`);
            return;
        }

        const sumT = sumTable(X, Y);
        const subT = subTable(X, Y);
        const mulT = mulTable(X, Y);
        const probT = probTable(PX, PY);

        setResult({
            X, Y, PX, PY,
            sumT, subT, mulT, probT,
            sortedSum: createSortedDistribution(sumT, probT),
            sortedSub: createSortedDistribution(subT, probT),
            sortedMul: createSortedDistribution(mulT, probT),
            statsX: calcStats(X, PX, 2, "X"),
            statsY: calcStats(Y, PY, 2, "Y"),
        });
    }

    function handleClear() {
        setResult(null);
    }

    // Для диалогов
    const X = parseVector(Xstr);
    const Y = parseVector(Ystr);
    const PX = parseVector(PXstr);
    const PY = parseVector(PYstr);

    return (
        <div className="main-container">
            <h2>Решалка распределений (React)</h2>
            <div>
                <label>Количество элементов X: <input type="number" value={sizeX} min={1} onChange={e => setSizeX(Number(e.target.value))} /></label>
            </div>
            <div>
                <label>Количество элементов Y: <input type="number" value={sizeY} min={1} onChange={e => setSizeY(Number(e.target.value))} /></label>
            </div>
            <div>
                <label>X (через пробел): <input value={Xstr} onChange={e => setXstr(e.target.value)} /></label>
            </div>
            <div>
                <label>Y (через пробел): <input value={Ystr} onChange={e => setYstr(e.target.value)} /></label>
            </div>
            <div>
                <label>P_X (через пробел): <input value={PXstr} onChange={e => setPXstr(e.target.value)} /></label>
            </div>
            <div>
                <label>P_Y (через пробел): <input value={PYstr} onChange={e => setPYstr(e.target.value)} /></label>
            </div>
            <div style={{ margin: "1em 0" }}>
                <button onClick={handleCalculate}>Рассчитать распределения</button>
                <button onClick={() => setShowPower(true)} style={{ marginLeft: 10 }}>Степень</button>
                <button onClick={() => setShowConst(true)} style={{ marginLeft: 10 }}>Расчеты с C</button>
                <button onClick={handleClear} style={{ marginLeft: 10 }}>Очистить</button>
            </div>
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
            <div style={{ marginTop: 40, color: "#888" }}>Программа разработана Школьником Е.С. и Георгием Х.Р.</div>
        </div>
    );
}

export default App;
