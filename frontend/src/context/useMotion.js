import {useContext} from 'react';import {MotionContext} from './MotionContext';
export function useMotion(){const value=useContext(MotionContext);if(!value)throw Error('Motion provider required');return value;}
