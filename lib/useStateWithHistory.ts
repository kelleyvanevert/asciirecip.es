import { useState } from "react";

export function useStateWithHistory<T>() {
  const [state, setState] = useState();
}
