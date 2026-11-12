import parse from 'html-react-parser';
export function EntgraFooter({ text }: { text: string }) {
  return <footer className="entgra-footer">{parse(text)}</footer>;
}
