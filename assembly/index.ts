export { getCompany  } from "./query_graph";

export function sayHello(name: string | null = null): string {
  return `Hello, ${name || "World"}!`;
}

