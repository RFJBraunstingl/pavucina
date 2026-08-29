import type { Metadata } from "next";

import TodoView from "./_components/todo-view";

export const metadata: Metadata = {
  title: "ToDo · Pavucina",
};

export default function Page() {
  return <TodoView />;
}
