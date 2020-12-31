export function replaceAt(string, index, character) {
  return (
    string.substr(0, index) +
    character +
    string.substr(index + character.length)
  );
}
