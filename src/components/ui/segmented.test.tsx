// @vitest-environment happy-dom

import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Segmented } from "./segmented";

const options = [
  { value: "all", label: "Todos" },
  { value: "available", label: "Disponibles" },
  { value: "lent", label: "Prestados" },
] as const;

type Value = (typeof options)[number]["value"];

function Filter({ initial = "all" }: { initial?: Value }) {
  const [value, setValue] = useState<Value>(initial);
  return (
    <>
      <Segmented label="Disponibilidad" value={value} options={options} onChange={setValue} />
      <output>{value}</output>
    </>
  );
}

const radio = (name: string) => screen.getByRole<HTMLInputElement>("radio", { name });
const chosen = () => screen.getByRole("status").textContent;

afterEach(cleanup);

describe("Segmented", () => {
  it("is a group of radios named by its label", () => {
    render(<Filter />);

    const group = screen.getByRole("group", { name: "Disponibilidad" });

    expect(group.querySelectorAll("input[type=radio]")).toHaveLength(3);
  });

  it("checks the current value", () => {
    render(<Filter initial="lent" />);

    expect(radio("Prestados").checked).toBe(true);
    expect(radio("Todos").checked).toBe(false);
  });

  it("selects the option a reader clicks", () => {
    render(<Filter />);

    fireEvent.click(screen.getByText("Disponibles"));

    expect(chosen()).toBe("available");
    expect(radio("Disponibles").checked).toBe(true);
    expect(radio("Todos").checked).toBe(false);
  });

  it("keeps two groups on one page apart", () => {
    render(
      <>
        <Filter />
        <Filter initial="lent" />
      </>,
    );

    const [first, second] = screen.getAllByRole("group");
    fireEvent.click(first.querySelectorAll("label")[1]);

    expect(screen.getAllByRole("status").map((output) => output.textContent)).toEqual([
      "available",
      "lent",
    ]);
    expect(second.querySelectorAll("input")[2].checked).toBe(true);
  });
});
