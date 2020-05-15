import React from 'react';
import { Layout, Row, Col, Card, Statistic, Modal, Form, Input, Radio, Table, message } from 'antd';
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

  constructor(props) {
    super(props);
    this.countryMap = new Map();
  }

  updateData = () => {
    const path = this.state.path;

    const init = {
      method: 'GET'
    };
    fetch('http://' + path, init)
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
          let convertedNode = this.convertNode(
            this.state.local.find((ele) => ele.key === localNodes[node]),
            localNodes[node],
            res.monitor.local.out[localNodes[node]],
            res.monitor.local.in[localNodes[node]]
          );
          if (convertedNode.outboundSizeTotal > 0) {
            local.push(convertedNode);
          }
        }

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
          let convertedNode = this.convertNode(
            this.state.remote.find((ele) => ele.key === remoteNodes[node]),
            remoteNodes[node],
            res.monitor.remote.out[remoteNodes[node]],
            res.monitor.remote.in[remoteNodes[node]]
          );
          if (convertedNode.outboundSizeTotal > 0) {
            remote.push(convertedNode);
          }
        }

        if (this.state.path === path) {
          if (!this.state.active) {
            message.success('Connect to ' + res.name + ' (' + path + ').');
          }
          this.setState({
            name: res.name,
            version: res.version,
            active: true,
            inactive: false,
            time: res.time || 0,
            outboundSize: outboundSize,
            outboundSizeTotal: outboundSizeTotal,
            inboundSize: inboundSize,
            inboundSizeTotal: inboundSizeTotal,
            local: local,
            remote: remote
          });
        }
      })
      .catch(() => {
        if (this.state.path === path) {
          if (!this.state.inactive) {
            if (!this.state.active) {
              message.error('Cannot connect to IkaGo (' + path + ').');
              message.info(
                <span>
                  {'If you have not used IkaGo yet, you can get it '}
                  <a href="https://github.com/zhxie/ikago">here</a>
                  {'.'}
                </span>,
                6
              );
            } else {
              message.warn('Disconnect from IkaGo (' + path + ').');
            }
          }
          this.setState({
            name: 'IkaGo Web',
            version: '',
            active: false,
            inactive: true,
            time: 0,
            outboundSize: 0,
            outboundSizeTotal: 0,
            inboundSize: 0,
            inboundSizeTotal: 0,
            local: [],
            remote: []
          });
        }
      });

    // DNS
    fetch('http://' + (path + '/dns').replace('//', '/'), init)
      .then((res) => res.json())
      .then((res) => {
        let dns = new Map();
        for (let i in res) {
          dns.set(res[i].ip, res[i].name);
        }

        if (this.state.path === path) {
          this.setState({ dns: dns });
        }
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

  mapNodes = (nodes) => {
    let map = new Map();
    let mappedNodes = [];
    for (let i in nodes) {
      let alias = this.state.dns.get(nodes[i].key);

      if (alias !== undefined) {
        let mappedParent = map.get(alias);
        if (mappedParent !== undefined) {
          mappedParent.main = nodes[i].lastSeen > mappedParent.children[0].lastSeen ? nodes[i].key : mappedParent.main;
          mappedParent.outboundSize = mappedParent.outboundSize + nodes[i].outboundSize;
          mappedParent.outboundSizeTotal = mappedParent.outboundSizeTotal + nodes[i].outboundSizeTotal;
          mappedParent.inboundSize = mappedParent.inboundSize + nodes[i].inboundSize;
          mappedParent.inboundSizeTotal = mappedParent.inboundSizeTotal + nodes[i].inboundSizeTotal;
          mappedParent.lastSeen = Math.max(mappedParent.lastSeen, nodes[i].lastSeen);
          mappedParent.children.push(nodes[i]);
          mappedParent.children.sort((first, second) => {
            return second.lastSeen - first.lastSeen;
          });
          map.set(alias, mappedParent);
        } else {
          map.set(alias, {
            key: alias,
            main: nodes[i].key,
            outboundSize: nodes[i].outboundSize,
            outboundSizeTotal: nodes[i].outboundSizeTotal,
            inboundSize: nodes[i].inboundSize,
            inboundSizeTotal: nodes[i].inboundSizeTotal,
            lastSeen: nodes[i].lastSeen,
            children: [nodes[i]]
          });
        }
      } else {
        mappedNodes.push(nodes[i]);
      }
    }

    map.forEach((value) => {
      mappedNodes.push(value);
    });
    mappedNodes.sort((first, second) => {
      return second.lastSeen - first.lastSeen;
    });

    return mappedNodes;
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

  showNode = (text) => {
    const partialIP = (text.main || text.key).substr(0, (text.main || text.key).lastIndexOf('.'));
    const countryCode = this.lookup(partialIP);
    if (countryCode === undefined) {
      return <span className="content-table-col-span">{text.key}</span>;
    }
    return (
      <span className="content-table-col-span">
        <ReactCountryFlag countryCode={countryCode} svg style={{ margin: '0 4px 0 0' }} />
        {text.key}
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
            <Col className="content-col" xs={24} sm={12} md={12} lg={6} xl={4}>
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
            <Col className="content-col" xs={24} sm={12} md={12} lg={6} xl={4}>
              <Card className="content-card" hoverable>
                <Statistic
                  precision={2}
                  prefix={<ClockCircleOutlined />}
                  title="Operation Time"
                  value={this.convertTime(this.state.time)}
                />
              </Card>
            </Col>
            <Col className="content-col" xs={24} sm={12} md={12} lg={6} xl={4}>
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
            <Col className="content-col" xs={24} sm={12} md={12} lg={6} xl={4}>
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
            <Col className="content-col" xs={24} sm={12} md={12} lg={6} xl={4}>
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
                  localStorage.setItem('path', values.path);
                  localStorage.setItem('showTotal', values.showTotal ? 'true' : 'false');
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
            <Col className="content-col-table" sm={24} md={24} lg={12}>
              <Table dataSource={this.mapNodes(this.state.local)} pagination={false} size="middle">
                <Column title="Source" key="source" align="left" render={this.showNode} />
                <Column title="Outbound" key="outboundSize" align="center" render={this.showOutbound} width={200} />
                <Column title="Inbound" key="inboundSize" align="center" render={this.showInbound} width={200} />
              </Table>
            </Col>
            <Col className="content-col-table" sm={24} md={24} lg={12}>
              <Table dataSource={this.mapNodes(this.state.remote)} pagination={false} size="middle">
                <Column title="Destination" key="source" align="left" render={this.showNode} />
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
    this.setState({
      path: localStorage.getItem('path') || 'localhost:18080',
      showTotal: localStorage.getItem('show') === 'true' ? true : false
    });
    this.timer = setInterval(this.updateData, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }
}

export default MainWindow;
