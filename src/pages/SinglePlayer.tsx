import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import {RouteComponentProps} from 'react-router';

import {SinglePlayer} from '../components/SinglePlayer/SinglePlayer';

const SinglePlayerWrapper: React.FC<RouteComponentProps<{gid: string}>> = (props) => {
  const gid = props.match.params.gid;

  return <SinglePlayer gid={gid} />;
};
export default SinglePlayerWrapper;
