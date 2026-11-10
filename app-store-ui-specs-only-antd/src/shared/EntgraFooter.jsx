import { Layout } from 'antd';
import parse from 'html-react-parser';
export default function EntgraFooter({ text }) {
  if (typeof text !== 'string') throw new TypeError('Footer text must be text');
  return <Layout.Footer className="entgra-footer">{parse(text)}</Layout.Footer>;
}
