import parse from 'html-react-parser';
export function EntgraFooter({ text }: { text: string }) {
  return (
    <footer className="entgra-footer">
      {parse(text, {
        replace(node) {
          if (node.type === 'text' && node.data.includes('Entgra'))
            return (
              <>
                {node.data.split('Entgra').map((part, i) => (
                  <span key={i}>
                    {i > 0 && <span className="text-primary">Entgra</span>}
                    {part}
                  </span>
                ))}
              </>
            );
        },
      })}
    </footer>
  );
}
