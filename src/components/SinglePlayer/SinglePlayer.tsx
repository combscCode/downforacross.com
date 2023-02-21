import React, {useState} from 'react';
import Flex from 'react-flexview';

export const SinglePlayer: React.FC<{gid: string}> = (props) => {
  const {gid} = props;
  return (
    <Flex column style={{flex: 1}}>
      <div>Hello World</div>
      <div>{gid}</div>
    </Flex>
  );
};
