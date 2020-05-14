import React from 'react';
import { Layout, Row, Col, Card, Statistic, Modal, Form, Input, Radio, Table, Tooltip, message } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  LoadingOutlined,
  SettingOutlined,
  WarningOutlined
} from '@ant-design/icons';
import ReactCountryFlag from 'react-country-flag';

import './MainWindow.css';
import logo from './assets/images/logo.png';

const { Header, Content } = Layout;
const { Column } = Table;

const ConfigurationForm = ({ visible, onOk, onCancel, initialValues }) => {
  const [form] = Form.useForm();
  return (
    <Modal
      visible={visible}
      title="Configuration"
      okText="Save"
      cancelText="Cancel"
      onCancel={onCancel}
      onOk={() => {
        form
          .validateFields()
          .then((values) => {
            onOk(values);
          })
          .catch(() => {});
      }}
    >
      <Form form={form} layout="vertical" name="configuration" initialValues={initialValues}>
        <Form.Item
          name="path"
          label="IkaGo Path"
          rules={[{ required: true, message: 'Please input the path of IkaGo.' }]}
        >
          <Input addonBefore="http://" />
        </Form.Item>
        <Form.Item name="showTotal" label="Data Presentation Mode">
          <Radio.Group>
            <Radio value={false}>Current</Radio>
            <Radio value={true}>Total</Radio>
          </Radio.Group>
        </Form.Item>
      </Form>
    </Modal>
  );
};

class MainWindow extends React.Component {
  state = {
    // Options
    configure: false,
    path: 'localhost:18080',
    showPacket: false,
    showTotal: false,
    // Header
    name: 'IkaGo Web',
    version: '',
    // Overall
    active: false,
    inactive: false,
    time: 0,
    outboundSize: 0,
    outboundSizeTotal: 0,
    inboundSize: 0,
    inboundSizeTotal: 0,
    // Nodes
    local: [],
    remote: [],
    // DNS
    dns: new Map()
  };

  updateData = () => {
    const init = {
      method: 'GET'
    };
    fetch('http://' + this.state.path, init)
      .then((res) => res.json())
      .then((res) => {
        // Overall
        let outboundSizeTotal = 0;
        for (let src in res.monitor.local.out) {
          outboundSizeTotal = outboundSizeTotal + res.monitor.local.out[src].size;
        }
        let outboundSize = 0;
        if (this.state.outboundSizeTotal !== 0) {
          outboundSize = outboundSizeTotal - this.state.outboundSizeTotal;
        }

        let inboundSizeTotal = 0;
        for (let src in res.monitor.local.in) {
          inboundSizeTotal = inboundSizeTotal + res.monitor.local.in[src].size;
        }
        let inboundSize = 0;
        if (this.state.inboundSizeTotal !== 0) {
          inboundSize = inboundSizeTotal - this.state.inboundSizeTotal;
        }

        // Nodes
        let localNodes = [];
        for (let node in res.monitor.local.out) {
          if (localNodes.find((ele) => ele === node) === undefined) {
            localNodes.push(node);
          }
        }
        for (let node in res.monitor.local.in) {
          if (localNodes.find((ele) => ele === node) === undefined) {
            localNodes.push(node);
          }
        }
        let local = [];
        for (let node in localNodes) {
          local.push(
            this.convertNode(
              this.state.local.find((ele) => ele.key === localNodes[node]),
              localNodes[node],
              res.monitor.local.out[localNodes[node]],
              res.monitor.local.in[localNodes[node]]
            )
          );
        }
        local.sort((first, second) => {
          return second.lastSeen - first.lastSeen;
        });

        let remoteNodes = [];
        for (let node in res.monitor.remote.out) {
          if (remoteNodes.find((ele) => ele === node) === undefined) {
            remoteNodes.push(node);
          }
        }
        for (let node in res.monitor.remote.in) {
          if (remoteNodes.find((ele) => ele === node) === undefined) {
            remoteNodes.push(node);
          }
        }
        let remote = [];
        for (let node in remoteNodes) {
          remote.push(
            this.convertNode(
              this.state.remote.find((ele) => ele.key === remoteNodes[node]),
              remoteNodes[node],
              res.monitor.remote.out[remoteNodes[node]],
              res.monitor.remote.in[remoteNodes[node]]
            )
          );
        }
        remote.sort((first, second) => {
          return second.lastSeen - first.lastSeen;
        });

        if (!this.state.active) {
          message.success('Connect to ' + res.name + ' (' + this.state.path + ').');
        }
        this.setState({
          offline: false,
          online: true,
          name: res.name,
          version: res.version,
          active: true,
          time: res.time !== undefined ? res.time : 0,
          outboundSize: outboundSize,
          outboundSizeTotal: outboundSizeTotal,
          inboundSize: inboundSize,
          inboundSizeTotal: inboundSizeTotal,
          local: local,
          remote: remote
        });
      })
      .catch(() => {
        if (!this.state.inactive) {
          if (!this.state.active) {
            message.error('Cannot connect to IkaGo (' + this.state.path + ').');
            // TODO: Link to common configuration of IkaGo
          } else {
            message.error('Disconnect from IkaGo (' + this.state.path + ').');
          }
        }
        this.setState({
          offline: true,
          online: false,
          name: 'IkaGo Web',
          version: '',
          active: false,
          time: 0,
          outboundSize: 0,
          outboundSizeTotal: 0,
          inboundSize: 0,
          inboundSizeTotal: 0,
          local: [],
          remote: []
        });
      });

    // DNS
    fetch('http://' + (this.state.path + '/dns').replace('//', '/'), init)
      .then((res) => res.json())
      .then((res) => {
        let dns = new Map();
        for (let i in res) {
          dns.set(res[i].ip, res[i].name);
        }
        console.log(dns);
        this.setState({ dns: dns });
      })
      .catch(() => {});
  };

  convertPath = (path) => {
    if (path.lastIndexOf(':') === -1) {
      return ':80';
    }
    return path.substring(path.lastIndexOf(':'));
  };

  convertTime = (time) => {
    time = time.toFixed(0);
    const hour = Math.floor(time / 3600);
    const min = Math.floor((time - 3600 * hour) / 60);
    const second = time - 3600 * hour - 60 * min;
    if (hour !== 0) {
      return hour + ':' + ('0' + min).substr(-2) + ':' + ('0' + second).substr(-2);
    } else {
      return ('0' + min).substr(-2) + ':' + ('0' + second).substr(-2);
    }
  };

  convertSize = (size) => {
    if (size > 1024 * 1024 * 1024) {
      return size / (1024 * 1024 * 1024);
    } else if (size > 1024 * 1024) {
      return size / (1024 * 1024);
    } else if (size > 1024) {
      return size / 1024;
    } else {
      return size;
    }
  };

  mapSizeUnit = (size) => {
    if (size > 1024 * 1024 * 1024) {
      return 'GB';
    } else if (size > 1024 * 1024) {
      return 'MB';
    } else if (size > 1024) {
      return 'kB';
    } else {
      return 'B';
    }
  };

  convertNode = (stateNode, key, outValue, inValue) => {
    if (stateNode !== undefined) {
      return {
        key: key,
        outboundSize: outValue !== undefined ? outValue.size - stateNode.outboundSizeTotal : 0,
        outboundSizeTotal: outValue !== undefined ? outValue.size : 0,
        inboundSize: inValue !== undefined ? inValue.size - stateNode.inboundSizeTotal : 0,
        inboundSizeTotal: inValue !== undefined ? inValue.size : 0,
        lastSeen: Math.max(outValue !== undefined ? outValue.lastSeen : 0, inValue !== undefined ? inValue.lastSeen : 0)
      };
    } else {
      return {
        key: key,
        outboundSize: 0,
        outboundSizeTotal: outValue !== undefined ? outValue.size : 0,
        inboundSize: 0,
        inboundSizeTotal: inValue !== undefined ? inValue.size : 0,
        lastSeen: Math.max(outValue !== undefined ? outValue.lastSeen : 0, inValue !== undefined ? inValue.lastSeen : 0)
      };
    }
  };

  lookup = (ip) => {
    if (this.countryMap.has(ip)) {
      const countryCode = this.countryMap.get(ip);
      if (typeof countryCode === 'number' && isFinite(countryCode)) {
        if (countryCode > 0) {
          this.countryMap.set(ip, countryCode - 1);
          return undefined;
        }
      } else {
        return countryCode;
      }
    }
    this.countryMap.set(ip, 15);

    const init = {
      method: 'GET'
    };
    fetch('http://ip-api.com/json/' + ip + '.1', init)
      .then((res) => res.json())
      .then((res) => {
        this.countryMap.set(ip, res.countryCode);
      })
      .catch(() => {});

    return undefined;
  };

  showIP = (text) => {
    const partialIP = text.key.substr(0, text.key.lastIndexOf('.'));
    const countryCode = this.lookup(partialIP);
    const name = this.state.dns.get(text.key);
    if (countryCode === undefined) {
      if (name !== undefined) {
        return <Tooltip title={text.key}>{name}</Tooltip>;
      }
      return text.key;
    }
    return (
      <span>
        <ReactCountryFlag countryCode={countryCode} svg />{' '}
        {name !== undefined ? <Tooltip title={text.key}>{name}</Tooltip> : text.key}
      </span>
    );
  };

  showOutbound = (text) => {
    if (this.state.showTotal) {
      return (
        (Math.floor(this.convertSize(text.outboundSizeTotal) * 10) / 10).toFixed(1) +
        ' ' +
        this.mapSizeUnit(text.outboundSizeTotal)
      );
    } else {
      return (
        (Math.floor(this.convertSize(text.outboundSize) * 10) / 10).toFixed(1) +
        ' ' +
        this.mapSizeUnit(text.outboundSize) +
        '/s'
      );
    }
  };

  showInbound = (text) => {
    if (this.state.showTotal) {
      return (
        (Math.floor(this.convertSize(text.inboundSizeTotal) * 10) / 10).toFixed(1) +
        ' ' +
        this.mapSizeUnit(text.inboundSizeTotal)
      );
    } else {
      return (
        (Math.floor(this.convertSize(text.inboundSize) * 10) / 10).toFixed(1) +
        ' ' +
        this.mapSizeUnit(text.inboundSize) +
        '/s'
      );
    }
  };

  render() {
    return (
      <Layout>
        <Header className="header">
          <a className="header-a" href="https://github.com/zhxie/ikago">
            <img className="header-icon" src={logo} alt="icon" />
          </a>
          <p className="header-title">{this.state.name}</p>
          <p className="header-subtitle">{this.state.version}</p>
        </Header>
        <Content className="content">
          <Row gutter={16}>
            <Col className="content-col" md={6} lg={4}>
              <Card className="content-card" hoverable>
                <Statistic
                  prefix={(() => {
                    if (this.state.active) {
                      return <CheckOutlined />;
                    } else if (this.state.inactive) {
                      return <WarningOutlined />;
                    } else {
                      return <LoadingOutlined />;
                    }
                  })()}
                  title="Status"
                  value={(() => {
                    if (this.state.active) {
                      return 'Active';
                    } else if (this.state.inactive) {
                      return 'Inactive';
                    } else {
                      return 'Connecting';
                    }
                  })()}
                  valueStyle={{
                    color: (() => {
                      if (!this.state.inactive) {
                        return '#000';
                      } else {
                        return '#cf1322';
                      }
                    })()
                  }}
                />
              </Card>
            </Col>
            <Col className="content-col" md={6} lg={4}>
              <Card className="content-card" hoverable>
                <Statistic
                  precision={2}
                  prefix={<ClockCircleOutlined />}
                  title="Operation Time"
                  value={this.convertTime(this.state.time)}
                />
              </Card>
            </Col>
            <Col className="content-col" md={6} lg={4}>
              <Card
                hoverable
                onClick={() => {
                  this.setState({
                    showTotal: !this.state.showTotal
                  });
                }}
              >
                <Statistic
                  precision={1}
                  prefix={<ArrowUpOutlined />}
                  suffix={(() => {
                    if (this.state.showTotal) {
                      return this.mapSizeUnit(this.state.outboundSizeTotal);
                    } else {
                      return this.mapSizeUnit(this.state.outboundSize) + '/s';
                    }
                  })()}
                  title="Outbound"
                  value={(() => {
                    if (this.state.showTotal) {
                      return this.convertSize(this.state.outboundSizeTotal);
                    } else {
                      return this.convertSize(this.state.outboundSize);
                    }
                  })()}
                />
              </Card>
            </Col>
            <Col className="content-col" md={6} lg={4}>
              <Card
                hoverable
                onClick={() => {
                  this.setState({
                    showTotal: !this.state.showTotal
                  });
                }}
              >
                <Statistic
                  precision={1}
                  prefix={<ArrowDownOutlined />}
                  suffix={(() => {
                    if (this.state.showTotal) {
                      return this.mapSizeUnit(this.state.inboundSizeTotal);
                    } else {
                      return this.mapSizeUnit(this.state.inboundSize) + '/s';
                    }
                  })()}
                  title="Inbound"
                  value={(() => {
                    if (this.state.showTotal) {
                      return this.convertSize(this.state.inboundSizeTotal);
                    } else {
                      return this.convertSize(this.state.inboundSize);
                    }
                  })()}
                />
              </Card>
            </Col>
            <Col className="content-col" md={6} lg={4}>
              <Card
                hoverable
                onClick={() => {
                  this.setState({
                    configure: true
                  });
                }}
              >
                <Statistic prefix={<SettingOutlined />} title="Configure" value={this.convertPath(this.state.path)} />
              </Card>
              <ConfigurationForm
                visible={this.state.configure}
                onOk={(values) => {
                  this.setState({
                    configure: false,
                    path: values.path,
                    showTotal: values.showTotal,
                    active: this.state.path !== values.path ? false : this.state.active,
                    inactive: this.state.path !== values.path ? false : this.state.inactive
                  });
                }}
                onCancel={() => {
                  this.setState({
                    configure: false
                  });
                }}
                initialValues={{ path: this.state.path, showTotal: this.state.showTotal }}
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col className="content-col-table" span={12}>
              <Table dataSource={this.state.local} pagination={false} size="middle">
                <Column title="Source" key="source" align="left" render={this.showIP} />
                <Column title="Outbound" key="outboundSize" align="center" render={this.showOutbound} width={200} />
                <Column title="Inbound" key="inboundSize" align="center" render={this.showInbound} width={200} />
              </Table>
            </Col>
            <Col className="content-col-table" span={12}>
              <Table dataSource={this.state.remote} pagination={false} size="middle">
                <Column title="Destination" key="source" align="left" render={this.showIP} />
                <Column title="Outbound" key="outboundSize" align="center" render={this.showOutbound} width={200} />
                <Column title="Inbound" key="inboundSize" align="center" render={this.showInbound} width={200} />
              </Table>
            </Col>
          </Row>
        </Content>
      </Layout>
    );
  }

  componentDidMount() {
    this.countryMap = new Map();
    this.updateData();
    this.timer = setInterval(this.updateData, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }
}

export default MainWindow;
