import { FC, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import classNames from "classnames";
import { FortLogo, XIconGray } from "../../../components/Icon";
import "./styles";
import { t, Trans } from "@lingui/macro";
import ConnectStatus from "./Status";

const Header: FC = () => {
  const location = useLocation();
  const [noticeHidden, setNoticeHidden] = useState(false);
  const header = "header";
  const routes = [
    { path: "/perpetuals", content: t`Futures` },
    { path: "/options", content: t`Options` },
    { path: "/farm", content: t`Farm` },
  ].map((item) => (
    <li
      key={item.path}
      className={classNames({
        selected: location.pathname.indexOf(item.path) === 0,
      })}
    >
      <Link to={item.path}>{item.content}</Link>
    </li>
  ));
  return (
    <header>
      <div
        className={classNames({
          [`${header}-notice`]: true,
          [`isHidden`]: noticeHidden,
        })}
      >
        <b>
          <Trans>
          Currently it is a test network, the price fluctuation has increased by 50 times, the slippage is large, and the slippage will be lower in a more realistic scenario.
          </Trans>
        </b>
        <button onClick={() => setNoticeHidden(true)}>
          <XIconGray />
        </button>
      </div>
      <div className={`${header}-nav`}>
        <a href={'https://www.hedge.red'}><FortLogo className={`${header}-logo`}/></a>
        <nav>
          <ul>{routes}</ul>
        </nav>
        <ConnectStatus />
      </div>
    </header>
  );
};

export default Header;
